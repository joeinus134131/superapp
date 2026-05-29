package domain

import (
	"time"

	"github.com/google/uuid"
)

type CoachMessage struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Title     string    `gorm:"not null" json:"title"`
	Body      string    `gorm:"type:text;not null" json:"body"`
	Type      string    `gorm:"not null" json:"type"` // "motivation", "warning", "reminder"
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CoachRepository interface {
	Save(msg *CoachMessage) error
	GetUnreadByUserID(userID uuid.UUID) ([]CoachMessage, error)
	MarkAsRead(messageIDs []uuid.UUID) error
}
