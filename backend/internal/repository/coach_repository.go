package repository

import (
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
	"gorm.io/gorm"
)

type coachRepository struct {
	db *gorm.DB
}

func NewCoachRepository(db *gorm.DB) domain.CoachRepository {
	return &coachRepository{db}
}

func (r *coachRepository) Save(msg *domain.CoachMessage) error {
	return r.db.Create(msg).Error
}

func (r *coachRepository) GetUnreadByUserID(userID uuid.UUID) ([]domain.CoachMessage, error) {
	var msgs []domain.CoachMessage
	err := r.db.Where("user_id = ? AND is_read = ?", userID, false).
		Order("created_at asc").
		Find(&msgs).Error
	return msgs, err
}

func (r *coachRepository) MarkAsRead(messageIDs []uuid.UUID) error {
	if len(messageIDs) == 0 {
		return nil
	}
	return r.db.Model(&domain.CoachMessage{}).
		Where("id IN ?", messageIDs).
		Update("is_read", true).Error
}
