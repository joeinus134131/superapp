package usecase

import (
	"errors"
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
