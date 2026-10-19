package finance

import (
	"encoding/json"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"time"
)

type coreHandler struct{ db *gorm.DB }

// User routes must be registered on the existing verified JWT/provisioned-user group.
func RegisterCore(router fiber.Router, db *gorm.DB) {
	h := coreHandler{db.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)})}
	router.Get("/finance/entities", h.entities)
	router.Get("/finance/bank-templates", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"schema_version": "1", "templates": BankTemplateCatalog()})
	})
	router.Post("/finance/entities", h.createEntity)
	router.Get("/finance/entities/:entity/goals", h.goals)
	router.Post("/finance/entities/:entity/goals", h.createGoal)
	router.Post("/finance/entities/:entity/goals/:id/allocations", h.allocateGoal)
	router.Post("/finance/entities/:entity/forecast", h.forecast)
	router.Get("/finance/entities/:entity/accounts", h.accounts)
	router.Post("/finance/entities/:entity/accounts", h.createAccount)
	router.Get("/finance/entities/:entity/journals", h.journals)
	router.Get("/finance/entities/:entity/balances", h.balances)
	router.Get("/finance/entities/:entity/imports", h.imports)
	router.Post("/finance/entities/:entity/imports/:id/review", h.review)
	router.Post("/finance/entities/:entity/journals", h.postJournal)
}
func user(c *fiber.Ctx) string {
	s, _ := c.Locals("user_id").(string)
	if !canonicalUUID(s) {
		return ""
	}
	return s
}
func membership(tx *gorm.DB, c *fiber.Ctx, write bool) error {
	if user(c) == "" || !canonicalUUID(c.Params("entity")) {
		return ErrUnauthorized
	}
	var role string
	// Lock membership against revocation while financial writes are in progress.
	r := tx.Raw("SELECT role FROM entity_memberships WHERE entity_id=? AND user_id=? AND revoked_at IS NULL FOR SHARE", c.Params("entity"), user(c)).Scan(&role)
	if r.Error != nil {
		return r.Error
	}
	if role == "" || (write && role == "viewer") {
		return ErrUnauthorized
	}
	return nil
}
func coreError(c *fiber.Ctx, err error) error {
	if errors.Is(err, ErrUnauthorized) {
		return failure(c, 403, "entity_access_denied", "Entity membership required")
	}
	if errors.Is(err, ErrConflict) {
		return failure(c, 409, "idempotency_conflict", "Key already used with different content")
	}
	return failure(c, 503, "storage_unavailable", "Finance operation could not be completed")
}
func (h coreHandler) entities(c *fiber.Ctx) error {
	if user(c) == "" {
		return failure(c, 401, "invalid_user", "Authenticated UUID required")
	}
	var rows []struct {
		ID           string `json:"id"`
		Kind         string `json:"kind"`
		DisplayName  string `json:"display_name"`
		BaseCurrency string `json:"base_currency"`
		Role         string `json:"role"`
	}
	if err := h.db.Raw("SELECT e.id,e.kind,e.display_name,e.base_currency,m.role FROM finance_entities e JOIN entity_memberships m ON m.entity_id=e.id WHERE m.user_id=? AND m.revoked_at IS NULL ORDER BY e.id", user(c)).Scan(&rows).Error; err != nil {
		return coreError(c, err)
	}
	return c.JSON(fiber.Map{"schema_version": "1", "entities": rows})
}
func (h coreHandler) createEntity(c *fiber.Ctx) error {
	var req struct {
		ID           string `json:"id"`
		Kind         string `json:"kind"`
		DisplayName  string `json:"display_name"`
		BaseCurrency string `json:"base_currency"`
	}
	if user(c) == "" {
		return failure(c, 401, "invalid_user", "Authenticated UUID required")
	}
	if c.BodyParser(&req) != nil || !canonicalUUID(req.ID) || (req.Kind != "personal" && req.Kind != "business" && req.Kind != "family") || len(req.DisplayName) < 1 || len(req.DisplayName) > 120 || (Money{"0", req.BaseCurrency}).Validate() != nil {
		return failure(c, 422, "invalid_entity", "Valid UUID, kind, name and currency required")
	}
	// Explicit client UUID makes creation safely retryable; ownership is server-authenticated.
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", req.ID).Error; err != nil {
			return err
		}
		var prior struct {
			OwnerUserID  string
			Kind         string
			DisplayName  string
			BaseCurrency string
		}
		r := tx.Raw("SELECT owner_user_id,kind,display_name,base_currency FROM finance_entities WHERE id=?", req.ID).Scan(&prior)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected > 0 {
			if prior.OwnerUserID != user(c) || prior.Kind != req.Kind || prior.DisplayName != req.DisplayName || prior.BaseCurrency != req.BaseCurrency {
				return ErrConflict
			}
			return nil
		}
		if err := tx.Exec("INSERT INTO finance_entities(id,owner_user_id,kind,display_name,base_currency) VALUES(?,?,?,?,?)", req.ID, user(c), req.Kind, req.DisplayName, req.BaseCurrency).Error; err != nil {
			return err
		}
		return tx.Exec("INSERT INTO entity_memberships(entity_id,user_id,role) VALUES(?,?,'owner')", req.ID, user(c)).Error
	})
	if err != nil {
		return coreError(c, err)
	}
	return c.Status(201).JSON(fiber.Map{"schema_version": "1", "entity_id": req.ID})
}

type account struct {
	ID          string `json:"id"`
	Kind        string `json:"kind"`
	DisplayName string `json:"display_name"`
	Currency    string `json:"currency"`
}

func (h coreHandler) accounts(c *fiber.Ctx) error {
	var rows []account
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, false); err != nil {
			return err
		}
		return tx.Raw("SELECT id,kind,display_name,currency FROM financial_accounts WHERE entity_id=? ORDER BY id", c.Params("entity")).Scan(&rows).Error
	})
	if err != nil {
		return coreError(c, err)
	}
	return c.JSON(fiber.Map{"schema_version": "1", "accounts": rows})
}
func (h coreHandler) createAccount(c *fiber.Ctx) error {
	var req account
	validKind := map[string]bool{"bank": true, "cash": true, "ewallet": true, "asset": true, "liability": true, "equity": true, "income": true, "expense": true}
	if c.BodyParser(&req) != nil || !canonicalUUID(req.ID) || !validKind[req.Kind] || len(req.DisplayName) < 1 || len(req.DisplayName) > 120 || (Money{"0", req.Currency}).Validate() != nil {
		return failure(c, 422, "invalid_account", "Invalid account fields")
	}
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, true); err != nil {
			return err
		}
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", req.ID).Error; err != nil {
			return err
		}
		var prior account
		r := tx.Raw("SELECT id,kind,display_name,currency FROM financial_accounts WHERE entity_id=? AND id=?", c.Params("entity"), req.ID).Scan(&prior)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected > 0 {
			if prior != req {
				return ErrConflict
			}
			return nil
		}
		return tx.Exec("INSERT INTO financial_accounts(id,entity_id,kind,display_name,currency) VALUES(?,?,?,?,?)", req.ID, c.Params("entity"), req.Kind, req.DisplayName, req.Currency).Error
	})
	if err != nil {
		return coreError(c, err)
	}
	return c.Status(201).JSON(fiber.Map{"schema_version": "1", "account_id": req.ID})
}

type journalRequest struct {
	Kind          string `json:"kind"`
	EffectiveDate string `json:"effective_date"`
	ReversalOf    string `json:"reversal_of,omitempty"`
	Lines         []Line `json:"lines"`
}

func (h coreHandler) postJournal(c *fiber.Ctx) error {
	var req journalRequest
	if c.BodyParser(&req) != nil {
		return failure(c, 400, "invalid_journal", "Invalid JSON")
	}
	key := c.Get("Idempotency-Key")
	if key == "" || len(key) > 128 {
		return failure(c, 400, "invalid_idempotency_key", "Idempotency-Key required")
	}
	if _, err := time.Parse("2006-01-02", req.EffectiveDate); err != nil {
		return failure(c, 422, "invalid_date", "Date must be YYYY-MM-DD")
	}
	if req.Kind != "opening" && req.Kind != "transfer" && req.Kind != "standard" && req.Kind != "reversal" {
		return failure(c, 422, "invalid_kind", "Invalid journal kind")
	}
	if req.Kind == "reversal" {
		if !canonicalUUID(req.ReversalOf) || len(req.Lines) != 0 {
			return failure(c, 422, "invalid_reversal", "Reversal references original entry; lines are derived by server")
		}
	} else if req.ReversalOf != "" || len(req.Lines) > 200 || ValidateJournal(req.Lines) != nil {
		return failure(c, 422, "invalid_journal", "Journal must balance with positive decimal amounts per currency")
	}
	var ack journalAck
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, true); err != nil {
			return err
		}
		var err error
		ack, err = postJournalTx(tx, c.Params("entity"), req, key)
		return err
	})
	if err != nil {
		return coreError(c, err)
	}
	return c.Status(201).JSON(fiber.Map{"schema_version": "1", "journal_id": ack.ID, "state": "posted", "duplicate": ack.Duplicate})
}

type journalAck struct {
	ID        string
	Duplicate bool
}

// Caller must authorize membership and keep review/journal writes in this transaction.
func postJournalTx(tx *gorm.DB, entity string, req journalRequest, key string) (journalAck, error) {
	body, _ := json.Marshal(req)
	hash := digest(body)
	id := uuid.NewString()
	duplicate := false
	err := func() error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", entity).Error; err != nil {
			return err
		}
		var prior struct {
			ID         string
			BodySHA256 string
		}
		r := tx.Raw("SELECT id,body_sha256 FROM journal_entries WHERE entity_id=? AND idempotency_key=?", entity, key).Scan(&prior)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected > 0 {
			if prior.BodySHA256 != hash {
				return ErrConflict
			}
			id = prior.ID
			duplicate = true
			return nil
		}
		if req.Kind == "reversal" {
			var n int64
			tx.Raw("SELECT count(*) FROM journal_entries WHERE entity_id=? AND reversal_of=?", entity, req.ReversalOf).Scan(&n)
			if n > 0 {
				return ErrConflict
			}
			var rows []struct {
				AccountID string
				Side      string
				Amount    string
				Currency  string
			}
			if err := tx.Raw("SELECT account_id,side,amount::text,currency FROM journal_lines WHERE entity_id=? AND entry_id=? ORDER BY id", entity, req.ReversalOf).Scan(&rows).Error; err != nil {
				return err
			}
			if len(rows) < 2 {
				return ErrUnauthorized
			}
			for _, l := range rows {
				req.Lines = append(req.Lines, Line{l.AccountID, l.Side, Money{l.Amount, l.Currency}})
			}
			req.Lines = Reverse(req.Lines)
		}
		// Opening is equity-backed, never income. Transfers keep principal between
		// cash/asset accounts with optional debit-only fee expenses.
		if req.Kind == "opening" || req.Kind == "transfer" {
			hasEquity, hasPosition := false, false
			cashAccounts := map[string]bool{}
			for _, line := range req.Lines {
				var kind string
				if err := tx.Raw("SELECT kind FROM financial_accounts WHERE entity_id=? AND id=?", entity, line.AccountID).Scan(&kind).Error; err != nil {
					return err
				}
				switch req.Kind {
				case "opening":
					if kind == "income" || kind == "expense" {
						return ErrConflict
					}
					if kind == "equity" {
						hasEquity = true
					} else if kind != "" {
						hasPosition = true
					}
				case "transfer":
					if kind == "expense" {
						if line.Side != "debit" {
							return ErrConflict
						}
					} else if kind == "bank" || kind == "cash" || kind == "ewallet" || kind == "asset" {
						cashAccounts[line.AccountID] = true
					} else {
						return ErrConflict
					}
				}
			}
			if req.Kind == "opening" && (!hasEquity || !hasPosition) {
				return ErrConflict
			}
			if req.Kind == "transfer" && len(cashAccounts) < 2 {
				return ErrConflict
			}
		}
		// Account scope/currency is verified before journal insertion; composite FKs backstop it.
		for _, line := range req.Lines {
			var n int64
			if err := tx.Raw("SELECT count(*) FROM financial_accounts WHERE entity_id=? AND id=? AND currency=? AND state='active'", entity, line.AccountID, line.Money.Currency).Scan(&n).Error; err != nil {
				return err
			}
			if n != 1 {
				return ErrUnauthorized
			}
		}
		var reversal interface{}
		if req.ReversalOf != "" {
			reversal = req.ReversalOf
		}
		if err := tx.Exec("INSERT INTO journal_entries(id,entity_id,kind,effective_date,idempotency_key,body_sha256,reversal_of) VALUES(?,?,?,?,?,?,?)", id, entity, req.Kind, req.EffectiveDate, key, hash, reversal).Error; err != nil {
			return err
		}
		for _, l := range req.Lines {
			if err := tx.Exec("INSERT INTO journal_lines(id,entity_id,entry_id,account_id,currency,side,amount) VALUES(?,?,?,?,?,?,?)", uuid.NewString(), entity, id, l.AccountID, l.Money.Currency, l.Side, l.Money.Amount).Error; err != nil {
				return err
			}
		}
		return nil
	}()
	return journalAck{id, duplicate}, err
}

func (h coreHandler) journals(c *fiber.Ctx) error {
	var rows []struct {
		ID            string  `json:"id"`
		Kind          string  `json:"kind"`
		EffectiveDate string  `json:"effective_date"`
		ReversalOf    *string `json:"reversal_of"`
	}
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, false); err != nil {
			return err
		}
		return tx.Raw("SELECT id,kind,effective_date::text,reversal_of FROM journal_entries WHERE entity_id=? ORDER BY effective_date DESC,id LIMIT 100", c.Params("entity")).Scan(&rows).Error
	})
	if err != nil {
		return coreError(c, err)
	}
	return c.JSON(fiber.Map{"schema_version": "1", "journals": rows, "limit": 100})
}

func (h coreHandler) balances(c *fiber.Ctx) error {
	var rows []struct {
		AccountID       string `json:"account_id"`
		Currency        string `json:"currency"`
		DebitLessCredit string `json:"debit_less_credit"`
	}
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, false); err != nil {
			return err
		}
		return tx.Raw("SELECT a.id AS account_id,a.currency,coalesce(sum(CASE l.side WHEN 'debit' THEN l.amount ELSE -l.amount END),0)::text AS debit_less_credit FROM financial_accounts a LEFT JOIN journal_lines l ON l.account_id=a.id AND l.entity_id=a.entity_id WHERE a.entity_id=? GROUP BY a.id,a.currency ORDER BY a.id", c.Params("entity")).Scan(&rows).Error
	})
	if err != nil {
		return coreError(c, err)
	}
	return c.JSON(fiber.Map{"schema_version": "1", "balances": rows, "basis": "posted_journal_debit_less_credit", "coverage": "configured_accounts_only"})
}
func (h coreHandler) imports(c *fiber.Ctx) error {
	var rows []struct {
		ID          string    `json:"id"`
		State       string    `json:"state"`
		CreatedAt   time.Time `json:"created_at"`
		SourceKind  string    `json:"source_kind"`
		Text        string    `json:"text"`
		Revision    *int64    `json:"revision"`
		ReviewState *string   `json:"review_state"`
	}
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, false); err != nil {
			return err
		}
		return tx.Raw("SELECT e.id,e.state,e.created_at,e.payload->'document'->>'kind' AS source_kind,left(e.payload->'document'->>'text',4000) AS text,c.revision,c.state AS review_state FROM integration_events e LEFT JOIN transaction_candidates c ON c.import_id=e.id AND c.entity_id=e.entity_id WHERE e.entity_id=? ORDER BY e.created_at DESC,e.id LIMIT 50", c.Params("entity")).Scan(&rows).Error
	})
	if err != nil {
		return coreError(c, err)
	}
	return c.JSON(fiber.Map{"schema_version": "1", "imports": rows, "limit": 50, "text_truncated_at": 4000})
}
