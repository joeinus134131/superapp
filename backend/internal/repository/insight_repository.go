package repository

import (
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
	"gorm.io/gorm"
)

type insightRepository struct {
	db *gorm.DB
}

func NewInsightRepository(db *gorm.DB) domain.InsightRepository {
	return &insightRepository{db}
}

func (r *insightRepository) Save(insight *domain.Insight) error {
	return r.db.Create(insight).Error
}

func (r *insightRepository) GetByUserID(userID uuid.UUID, limit int) ([]domain.Insight, error) {
	var insights []domain.Insight
	err := r.db.Where("user_id = ?", userID).
		Order("created_at desc").
		Limit(limit).
		Find(&insights).Error
	return insights, err
}
