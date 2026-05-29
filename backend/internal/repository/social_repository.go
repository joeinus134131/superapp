package repository

import (
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type socialRepository struct {
	db *gorm.DB
}

func NewSocialRepository(db *gorm.DB) domain.SocialRepository {
	return &socialRepository{db}
}

func (r *socialRepository) GetGlobalLeaderboard(limit int) ([]domain.LeaderboardEntry, error) {
	var entries []domain.LeaderboardEntry
	// Ambil TOP performers berdasarkan TotalXP terbanyak
	err := r.db.Order("total_xp desc").Limit(limit).Find(&entries).Error
	return entries, err
}

func (r *socialRepository) UpdateUserStats(entry domain.LeaderboardEntry) error {
	// Upsert: Kalau UserID sudah ada, update Level, Name, dan XP-nya
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", "avatar", "level", "total_xp", "last_seen"}),
	}).Create(&entry).Error
}

func (r *socialRepository) GetSquadsByUserID(userID uuid.UUID) ([]domain.Squad, error) {
	var squads []domain.Squad
	// Di Phase 4 awal, kita ambil squad di mana user adalah creatornya
	// Ke depannya kita bisa tambahkan tabel relasi SquadMembers
	err := r.db.Where("creator_id = ?", userID).Find(&squads).Error
	return squads, err
}

func (r *socialRepository) CreateSquad(squad *domain.Squad) error {
	return r.db.Create(squad).Error
}

func (r *socialRepository) CreateChallenge(challenge *domain.Challenge) error {
	return r.db.Create(challenge).Error
}

func (r *socialRepository) GetChallengesBySquad(squadID uuid.UUID) ([]domain.Challenge, error) {
	var challenges []domain.Challenge
	err := r.db.Where("squad_id = ?", squadID).Find(&challenges).Error
	return challenges, err
}

func (r *socialRepository) UpdateChallengeProgress(progress *domain.ChallengeProgress) error {
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "challenge_id"}, {Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"current", "is_completed", "updated_at"}),
	}).Create(progress).Error
}

func (r *socialRepository) GetChallengeProgress(challengeID uuid.UUID) ([]domain.ChallengeProgress, error) {
	var progress []domain.ChallengeProgress
	err := r.db.Where("challenge_id = ?", challengeID).Find(&progress).Error
	return progress, err
}
