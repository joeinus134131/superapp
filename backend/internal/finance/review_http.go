package finance

import (
	"encoding/json"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type reviewRequest struct {
	ExpectedRevision  int64           `json:"expected_revision"`
	Action            string          `json:"action"`
	Reason            string          `json:"reason"`
	ExistingJournalID string          `json:"existing_journal_id,omitempty"`
	Journal           *journalRequest `json:"journal,omitempty"`
}

func (h coreHandler) review(c *fiber.Ctx) error {
	var req reviewRequest
	if !canonicalUUID(c.Params("id")) || c.BodyParser(&req) != nil || req.ExpectedRevision < 1 || len(req.Reason) < 1 || len(req.Reason) > 1000 {
		return failure(c, 422, "invalid_review", "Source UUID, expected revision and reason required")
	}
	key := c.Get("Idempotency-Key")
	if len(key) < 1 || len(key) > 128 {
		return failure(c, 400, "invalid_idempotency_key", "Idempotency-Key required")
	}
	switch req.Action {
	case "accept_new":
		if req.Journal == nil || req.ExistingJournalID != "" || (req.Journal.Kind != "standard" && req.Journal.Kind != "transfer") || req.Journal.ReversalOf != "" || len(req.Journal.Lines) > 200 || ValidateJournal(req.Journal.Lines) != nil {
			return failure(c, 422, "invalid_review_journal", "Reviewed balanced standard or transfer journal required")
		}
		if _, err := time.Parse("2006-01-02", req.Journal.EffectiveDate); err != nil {
			return failure(c, 422, "invalid_date", "Date must be YYYY-MM-DD")
		}
	case "match_existing":
		if !canonicalUUID(req.ExistingJournalID) || req.Journal != nil {
			return failure(c, 422, "invalid_match", "Existing journal UUID required")
		}
	case "reject", "unresolved":
		if req.Journal != nil || req.ExistingJournalID != "" {
			return failure(c, 422, "invalid_review", "No journal allowed for this action")
		}
	default:
		return failure(c, 422, "invalid_review_action", "Unsupported review action")
	}
	body, _ := json.Marshal(req)
	hash := digest(body)
	state := ""
	revision := int64(0)
	journalID := ""
	duplicate := false
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, true); err != nil {
			return err
		}
		// Same entity lock order as manual posting prevents duplicate decisions and deadlocks.
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", c.Params("entity")).Error; err != nil {
			return err
		}
		var prior struct {
			BodySHA256  string
			CandidateID string
			Action      string
			NewRevision int64
			JournalID   *string
		}
		r := tx.Raw("SELECT body_sha256,candidate_id,action,new_revision,journal_id FROM review_actions WHERE entity_id=? AND idempotency_key=?", c.Params("entity"), key).Scan(&prior)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected > 0 {
			if prior.CandidateID != c.Params("id") || prior.BodySHA256 != hash {
				return ErrConflict
			}
			duplicate = true
			revision = prior.NewRevision
			if prior.JournalID != nil {
				journalID = *prior.JournalID
			}
			state = reviewState(prior.Action)
			return nil
		}
		var candidate struct {
			ID       string
			Revision int64
			State    string
		}
		r = tx.Raw("SELECT id,revision,state FROM transaction_candidates WHERE entity_id=? AND import_id=? FOR UPDATE", c.Params("entity"), c.Params("id")).Scan(&candidate)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected != 1 {
			return ErrUnauthorized
		}
		if candidate.Revision != req.ExpectedRevision || candidate.State != "needs_review" {
			return ErrConflict
		}
		switch req.Action {
		case "accept_new":
			ack, err := postJournalTx(tx, c.Params("entity"), *req.Journal, "review:"+uuid.NewString())
			if err != nil {
				return err
			}
			journalID = ack.ID
		case "match_existing":
			var n int64
			if err := tx.Raw("SELECT count(*) FROM journal_entries WHERE entity_id=? AND id=?", c.Params("entity"), req.ExistingJournalID).Scan(&n).Error; err != nil {
				return err
			}
			if n != 1 {
				return ErrUnauthorized
			}
			journalID = req.ExistingJournalID
		}
		state = reviewState(req.Action)
		revision = candidate.Revision + 1
		var journal interface{}
		if journalID != "" {
			journal = journalID
		}
		if err := tx.Exec("UPDATE transaction_candidates SET revision=?,state=?,journal_id=? WHERE id=?", revision, state, journal, candidate.ID).Error; err != nil {
			return err
		}
		sourceState := "completed"
		if state == "needs_review" {
			sourceState = "needs_review"
		}
		if err := tx.Exec("UPDATE integration_events SET state=? WHERE id=? AND entity_id=?", sourceState, c.Params("id"), c.Params("entity")).Error; err != nil {
			return err
		}
		if err := tx.Exec("INSERT INTO review_actions(id,entity_id,candidate_id,actor_user_id,idempotency_key,body_sha256,action,previous_revision,new_revision,journal_id,reason) VALUES(?,?,?,?,?,?,?,?,?,?,?)", uuid.NewString(), c.Params("entity"), candidate.ID, user(c), key, hash, req.Action, candidate.Revision, revision, journal, req.Reason).Error; err != nil {
			return err
		}
		payload, _ := json.Marshal(map[string]interface{}{"schema_version": "1", "import_id": c.Params("id"), "state": state, "revision": revision})
		return tx.Exec("INSERT INTO outbox_events(id,entity_id,event_type,payload) VALUES(?,?,?,?::jsonb)", uuid.NewString(), c.Params("entity"), "finance.review.completed", string(payload)).Error
	})
	if err != nil {
		return coreError(c, err)
	}
	return c.JSON(fiber.Map{"schema_version": "1", "import_id": c.Params("id"), "review_state": state, "revision": revision, "journal_id": journalID, "duplicate": duplicate})
}
func reviewState(action string) string {
	switch action {
	case "accept_new":
		return "accepted"
	case "match_existing":
		return "matched_existing"
	case "reject":
		return "rejected"
	default:
		return "needs_review"
	}
}
