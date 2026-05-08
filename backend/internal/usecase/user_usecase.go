package usecase

import (
	"time"

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
