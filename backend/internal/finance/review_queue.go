package finance

import (
	"encoding/json"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// QueueForManualReview runs draft-only extraction and cannot create journals. Each
// locked durable job advances atomically; a crash rolls it back for retry.
func QueueForManualReview(db *gorm.DB) (bool, error) {
	processed := false
	err := db.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)}).Transaction(func(tx *gorm.DB) error {
		var job struct {
			ID       string
			ImportID string
		}
		r := tx.Raw("SELECT id,import_id FROM durable_jobs WHERE state='queued' AND available_at<=now() ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1").Scan(&job)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected == 0 {
			return nil
		}
		var entity string
		if err := tx.Raw("UPDATE integration_events SET state='needs_review' WHERE id=? AND state='received' RETURNING entity_id", job.ImportID).Scan(&entity).Error; err != nil {
			return err
		}
		if entity != "" {
			var payload string
			if err := tx.Raw("SELECT payload::text FROM integration_events WHERE id=? AND entity_id=?", job.ImportID, entity).Scan(&payload).Error; err != nil {
				return err
			}
			var event ImportEvent
			if err := json.Unmarshal([]byte(payload), &event); err != nil {
				return err
			}
			extraction := ExtractDraft(event.Document)
			encoded, err := json.Marshal(extraction)
			if err != nil {
				return err
			}
			fields, err := json.Marshal(extraction.Fields)
			if err != nil {
				return err
			}
			if err := tx.Exec("INSERT INTO extraction_runs(id,entity_id,import_id,parser_id,parser_version,schema_version,output) VALUES(?,?,?,?,?,'1',?::jsonb) ON CONFLICT(import_id,parser_id,parser_version) DO NOTHING", uuid.NewString(), entity, job.ImportID, extraction.ParserID, extraction.ParserVersion, string(encoded)).Error; err != nil {
				return err
			}

			if err := tx.Exec("INSERT INTO transaction_candidates(id,entity_id,import_id) VALUES(?,?,?) ON CONFLICT(import_id) DO NOTHING", job.ImportID, entity, job.ImportID).Error; err != nil {
				return err
			}
			if err := tx.Exec("UPDATE transaction_candidates SET fields=?::jsonb WHERE import_id=? AND state='needs_review' AND revision=1", string(fields), job.ImportID).Error; err != nil {
				return err
			}
			p, _ := json.Marshal(map[string]string{"schema_version": "1", "import_id": job.ImportID})
			if err := tx.Exec("INSERT INTO outbox_events(id,entity_id,event_type,payload) VALUES(?,?,?,?::jsonb)", uuid.NewString(), entity, "finance.import.needs_review", string(p)).Error; err != nil {
				return err
			}
		}
		if err := tx.Exec("UPDATE durable_jobs SET state='completed',attempts=attempts+1 WHERE id=?", job.ID).Error; err != nil {
			return err
		}
		processed = true
		return nil
	})
	return processed, err
}
