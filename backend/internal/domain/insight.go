package domain

import (
	"time"

	"github.com/google/uuid"
)

type Insight struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	InsightType    string    `gorm:"not null" json:"insight_type"` // "correlation", "warning", "praise"
	Content        string    `gorm:"type:text;not null" json:"content"`
	RelatedModules string    `gorm:"type:text" json:"related_modules"` // comma-separated or json, e.g. "finance,habits"
	Confidence     int       `gorm:"default:80" json:"confidence_score"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type InsightRepository interface {
	Save(insight *Insight) error
	GetByUserID(userID uuid.UUID, limit int) ([]Insight, error)
}
