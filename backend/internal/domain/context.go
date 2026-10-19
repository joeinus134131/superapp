package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type UserContext struct {
	ID             uuid.UUID       `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	UserID         uuid.UUID       `gorm:"type:uuid;not null" json:"user_id"`
	ModuleType     string          `gorm:"not null" json:"module_type"`
	DataPayload    json.RawMessage `gorm:"type:jsonb;not null" json:"data_payload"`
	EventTimestamp time.Time       `gorm:"default:CURRENT_TIMESTAMP" json:"event_timestamp"`
	IsSyncedToAI   bool            `gorm:"default:false" json:"is_synced_to_ai"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type SyncRequest struct {
	Items []UserContext `json:"items"`
}

type ContextRepository interface {
	SaveBatch(contexts []UserContext) error
	GetByUserID(userID uuid.UUID) ([]UserContext, error)
}

type ContextUsecase interface {
	SyncContexts(userID uuid.UUID, contexts []UserContext) error
	GetLatestContexts(userID uuid.UUID) ([]UserContext, error)
}


// UserData is the durable, database-backed representation of one client storage
// key. Payload intentionally remains JSON so old local-cache schemas can be
// migrated without a destructive, all-at-once rewrite.
type UserData struct {
	ID              uuid.UUID       `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	UserID          uuid.UUID       `gorm:"type:uuid;not null;uniqueIndex:idx_user_data_owner_key" json:"user_id"`
	StorageKey      string          `gorm:"not null;uniqueIndex:idx_user_data_owner_key" json:"storage_key"`
	Payload         json.RawMessage `gorm:"type:jsonb;not null" json:"payload"`
	SchemaVersion   int             `gorm:"not null;default:1" json:"schema_version"`
	Revision        int64           `gorm:"not null;default:1" json:"revision"`
	Checksum        string          `gorm:"size:64;not null" json:"checksum"`
	ClientUpdatedAt time.Time       `gorm:"not null" json:"client_updated_at"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

type DataMigration struct {
	RequestSHA256  string    `gorm:"size:64" json:"-"`
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_data_migration_owner_key" json:"user_id"`
	IdempotencyKey string    `gorm:"not null;uniqueIndex:idx_data_migration_owner_key" json:"idempotency_key"`
	ItemCount      int       `gorm:"not null" json:"item_count"`
	Status         string    `gorm:"size:24;not null" json:"status"`
	CreatedAt      time.Time `json:"created_at"`
}

type MigrationItem struct {
	StorageKey      string          `json:"storage_key"`
	Payload         json.RawMessage `json:"payload"`
	SchemaVersion   int             `json:"schema_version"`
	Revision        int64           `json:"revision"`
	Checksum        string          `json:"checksum"`
	ClientUpdatedAt time.Time       `json:"client_updated_at"`
}

type MigrationRequest struct {
	IdempotencyKey string          `json:"idempotency_key"`
	Items          []MigrationItem `json:"items"`
}

type MigrationResult struct {
	MigrationID uuid.UUID `json:"migration_id"`
	Imported    int       `json:"imported"`
	Skipped     int       `json:"skipped"`
	Status      string    `json:"status"`
}

type UserDataRepository interface {
	Migrate(userID uuid.UUID, idempotencyKey string, items []UserData) (*MigrationResult, error)
	List(userID uuid.UUID) ([]UserData, error)
}
