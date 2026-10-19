package finance

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"github.com/google/uuid"
	"regexp"
	"time"
)

type Document struct {
	Kind          string                 `json:"kind"`
	ContentSHA256 string                 `json:"content_sha256"`
	Text          *string                `json:"text"`
	StorageRef    *string                `json:"storage_ref"`
	Metadata      map[string]interface{} `json:"metadata"`
}
type ImportEvent struct {
	SchemaVersion     string    `json:"schema_version"`
	EventID           string    `json:"event_id"`
	EventType         string    `json:"event_type"`
	ConnectionID      string    `json:"connection_id"`
	Provider          string    `json:"provider"`
	ProviderMessageID string    `json:"provider_message_id"`
	ReceivedAt        time.Time `json:"received_at"`
	Document          Document  `json:"document"`
}
type ImportResult struct {
	SchemaVersion string `json:"schema_version"`
	ImportID      string `json:"import_id"`
	State         string `json:"state"`
	Duplicate     bool   `json:"duplicate"`
}

func canonicalUUID(s string) bool {
	u, e := uuid.Parse(s)
	return e == nil && u != uuid.Nil && u.String() == s
}
func (e ImportEvent) Validate() error {
	if e.SchemaVersion != "1" || !canonicalUUID(e.EventID) || !canonicalUUID(e.ConnectionID) || e.EventType != "finance.document.received" {
		return fmt.Errorf("invalid event envelope")
	}
	if e.Provider == "" || len(e.Provider) > 64 || e.ProviderMessageID == "" || len(e.ProviderMessageID) > 512 || e.ReceivedAt.IsZero() || e.Document.Kind == "" {
		return fmt.Errorf("missing source fields")
	}
	// Vault references deliberately fail closed until a private upload registry exists.
	if e.Document.Text == nil || *e.Document.Text == "" || e.Document.StorageRef != nil {
		return fmt.Errorf("only nonempty text documents are supported; vault upload is not configured")
	}
	hash := sha256.Sum256([]byte(*e.Document.Text))
	if e.Document.ContentSHA256 != hex.EncodeToString(hash[:]) {
		return fmt.Errorf("document hash mismatch")
	}
	return nil
}

var decimal = regexp.MustCompile(`^(0|[1-9][0-9]{0,25})(\.[0-9]{1,8})?$`)

type Money struct {
	Amount   string `json:"amount"`
	Currency string `json:"currency"`
}

func (m Money) Validate() error {
	if !decimal.MatchString(m.Amount) || !regexp.MustCompile(`^[A-Z]{3}$`).MatchString(m.Currency) {
		return fmt.Errorf("invalid decimal money")
	}
	return nil
}
