package finance

import (
	"encoding/json"
	"errors"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var ErrConflict = errors.New("idempotency or source conflict")
var ErrUnauthorized = errors.New("connection unavailable")

type Connection struct {
	ID       string
	EntityID string
	Provider string
}
type Store interface {
	Connection(string) (Connection, error)
	Accept(Connection, ImportEvent, string, string, []byte) (ImportResult, error)
	Status(Connection, string) (ImportResult, error)
}
type PostgresStore struct{ DB *gorm.DB }

func (s PostgresStore) Connection(hash string) (Connection, error) {
	var c Connection
	r := s.DB.Raw("SELECT id, entity_id, provider FROM integration_connections WHERE token_sha256=? AND state='active'", hash).Scan(&c)
	if r.Error != nil {
		return c, r.Error
	}
	if r.RowsAffected != 1 {
		return c, ErrUnauthorized
	}
	return c, nil
}
func (s PostgresStore) Accept(c Connection, e ImportEvent, key, hash string, body []byte) (ImportResult, error) {
	out := ImportResult{SchemaVersion: "1"}
	err := s.DB.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)}).Transaction(func(tx *gorm.DB) error {
		// Lock the connection to serialize dedup and coordinate revocation.
		var active string
		if err := tx.Raw("SELECT id FROM integration_connections WHERE id=? AND state='active' FOR UPDATE", c.ID).Scan(&active).Error; err != nil {
			return err
		}
		if active == "" {
			return ErrUnauthorized
		}
		var rows []struct {
			ID                string
			State             string
			BodySHA256        string
			IdempotencyKey    string
			ContentSHA256     string
			ProviderMessageID string
		}
		if err := tx.Raw("SELECT id,state,body_sha256,idempotency_key,content_sha256,provider_message_id FROM integration_events WHERE connection_id=? AND (idempotency_key=? OR event_id=? OR provider_message_id=?)", c.ID, key, e.EventID, e.ProviderMessageID).Scan(&rows).Error; err != nil {
			return err
		}
		if len(rows) > 0 {
			if len(rows) != 1 {
				return ErrConflict
			}
			r := rows[0]
			if r.BodySHA256 != hash {
				return ErrConflict
			}
			out.ImportID = r.ID
			out.State = r.State
			out.Duplicate = true
			return nil
		}
		out.ImportID = uuid.NewString()
		out.State = "received"
		if err := tx.Exec("INSERT INTO integration_events(id,entity_id,connection_id,event_id,idempotency_key,body_sha256,provider_message_id,content_sha256,payload) VALUES(?,?,?,?,?,?,?,?,?::jsonb)", out.ImportID, c.EntityID, c.ID, e.EventID, key, hash, e.ProviderMessageID, e.Document.ContentSHA256, string(body)).Error; err != nil {
			return err
		}
		if err := tx.Exec("INSERT INTO durable_jobs(id,import_id) VALUES(?,?)", uuid.NewString(), out.ImportID).Error; err != nil {
			return err
		}
		payload, _ := json.Marshal(map[string]string{"import_id": out.ImportID, "schema_version": "1"})
		return tx.Exec("INSERT INTO outbox_events(id,entity_id,event_type,payload) VALUES(?,?,?,?::jsonb)", uuid.NewString(), c.EntityID, "finance.import.received", string(payload)).Error
	})
	return out, err
}
func (s PostgresStore) Status(c Connection, id string) (ImportResult, error) {
	out := ImportResult{SchemaVersion: "1"}
	r := s.DB.Raw("SELECT id AS import_id,state FROM integration_events WHERE id=? AND connection_id=? AND entity_id=?", id, c.ID, c.EntityID).Scan(&out)
	out.SchemaVersion = "1"
	if r.Error != nil {
		return out, r.Error
	}
	if r.RowsAffected != 1 {
		return out, gorm.ErrRecordNotFound
	}
	return out, nil
}
