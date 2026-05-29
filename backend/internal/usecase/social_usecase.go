package usecase

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
)

type socialUsecase struct {
	repo domain.SocialRepository
}

func NewSocialUsecase(repo domain.SocialRepository) domain.SocialUsecase {
	return &socialUsecase{repo}
}

func (u *socialUsecase) GetLeaderboard() ([]domain.LeaderboardEntry, error) {
	// Ambil TOP 100 global
	return u.repo.GetGlobalLeaderboard(100)
}

func (u *socialUsecase) GetMySquads(userID uuid.UUID) ([]domain.Squad, error) {
	return u.repo.GetSquadsByUserID(userID)
}

func (u *socialUsecase) CreateNewSquad(userID uuid.UUID, name, desc string) (*domain.Squad, error) {
	if name == "" {
		return nil, errors.New("nama squad tidak boleh kosong")
	}

	squad := &domain.Squad{
		ID:          uuid.New(),
		Name:        name,
		Description: desc,
		CreatorID:   userID,
		MemberCount: 1,
	}

	if err := u.repo.CreateSquad(squad); err != nil {
		return nil, err
	}

	return squad, nil
}

func (u *socialUsecase) CreateChallenge(squadID uuid.UUID, title, challengeType string, target, stakeXP int, startDate, endDate time.Time) (*domain.Challenge, error) {
	if title == "" {
		return nil, errors.New("judul challenge tidak boleh kosong")
	}

	challenge := &domain.Challenge{
		ID:        uuid.New(),
		SquadID:   squadID,
		Title:     title,
		Type:      challengeType,
		Target:    target,
		StakeXP:   stakeXP,
		StartDate: startDate,
		EndDate:   endDate,
	}

	if err := u.repo.CreateChallenge(challenge); err != nil {
		return nil, err
	}

	return challenge, nil
}

func (u *socialUsecase) GetSquadChallenges(squadID uuid.UUID) ([]domain.Challenge, error) {
	return u.repo.GetChallengesBySquad(squadID)
}

func (u *socialUsecase) UpdateProgress(challengeID, userID uuid.UUID, increment int) (*domain.ChallengeProgress, error) {
	// Simple update logic. In a real app we'd fetch current progress, add increment, and check if target is met.
	// We'll just do a basic implementation here for Phase 5 initial setup.
	progress := &domain.ChallengeProgress{
		ChallengeID: challengeID,
		UserID:      userID,
		Current:     increment, // In reality, we'd add to existing
		IsCompleted: false,
	}

	if err := u.repo.UpdateChallengeProgress(progress); err != nil {
		return nil, err
	}

	return progress, nil
}
