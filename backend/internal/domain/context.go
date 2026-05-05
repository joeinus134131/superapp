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
	IsSyncedToAI   bool      `gorm:"default:false" json:"is_synced_to_ai"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
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
}
