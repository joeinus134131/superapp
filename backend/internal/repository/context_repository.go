package repository

import (
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
	"gorm.io/gorm"
)

type contextRepository struct {
	db *gorm.DB
}

func NewContextRepository(db *gorm.DB) domain.ContextRepository {
	return &contextRepository{db}
}

func (r *contextRepository) SaveBatch(contexts []domain.UserContext) error {
	// GORM Create In Batches untuk performa tinggi
	return r.db.CreateInBatches(contexts, 100).Error
}

func (r *contextRepository) GetByUserID(userID uuid.UUID) ([]domain.UserContext, error) {
	var contexts []domain.UserContext
	err := r.db.Where("user_id = ?", userID).Find(&contexts).Error
	return contexts, err
}
