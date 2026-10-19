package usecase

import (
	"time"

	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
)

type userUsecase struct {
	repo domain.UserRepository
}

func NewUserUsecase(repo domain.UserRepository) domain.UserUsecase {
	return &userUsecase{repo}
}

func (u *userUsecase) RegisterOrUpdate(user *domain.User) error {
	user.LastLogin = time.Now()
	return u.repo.Create(user)
}

func (u *userUsecase) EnsureUser(id uuid.UUID, email string) error {
	return u.repo.EnsureExists(&domain.User{
		ID:        id,
		Email:     email,
		LastLogin: time.Now(),
	})
}
