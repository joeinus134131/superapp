package repository

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &userRepository{db}
}

func (r *userRepository) Create(user *domain.User) error {
	var existing domain.User
	// Check by ID first
	if err := r.db.First(&existing, "id = ?", user.ID).Error; err == nil {
		updates := map[string]interface{}{
			"last_login": user.LastLogin,
		}
		if user.Email != "" && user.Email != existing.Email {
			// If email changed, check if it conflicts with another user
			var emailConflict domain.User
			if err := r.db.First(&emailConflict, "email = ? AND id != ?", user.Email, user.ID).Error; err == nil {
				// Avoid unique key violation by archiving old user email
				r.db.Model(&emailConflict).Update("email", fmt.Sprintf("%s_archived_%d", emailConflict.Email, time.Now().Unix()))
			}
			updates["email"] = user.Email
		}
		if user.Name != "" {
			updates["name"] = user.Name
		}
		if user.Avatar != "" {
			updates["avatar"] = user.Avatar
		}
		return r.db.Model(&existing).Updates(updates).Error
	}

	// If not found by ID, check if email already exists
	if strings.TrimSpace(user.Email) != "" {
		if err := r.db.First(&existing, "email = ?", user.Email).Error; err == nil {
			// A row with this email exists with a different ID (e.g. from prior seed/test).
			// Archive that email so the new authenticated user ID can be safely inserted.
			r.db.Model(&existing).Update("email", fmt.Sprintf("%s_old_%d", existing.Email, time.Now().Unix()))
		}
	}

	// Normal upsert by ID
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"email", "last_login", "name", "avatar"}),
	}).Create(user).Error
}

// EnsureExists inserts the user if absent and silently ignores any conflict, so
// a request from a valid JWT subject always ends with a matching users row.
func (r *userRepository) EnsureExists(user *domain.User) error {
	if strings.TrimSpace(user.Email) == "" {
		user.Email = user.ID.String() + "@supabase.local"
	}
	var existing domain.User
	if err := r.db.First(&existing, "id = ?", user.ID).Error; err == nil {
		return nil
	}
	// Check if another user has this email to avoid unique constraint failure
	var emailConflict domain.User
	if err := r.db.First(&emailConflict, "email = ? AND id != ?", user.Email, user.ID).Error; err == nil {
		user.Email = user.ID.String() + "@supabase.local"
	}

	return r.db.Clauses(clause.OnConflict{DoNothing: true}).Create(user).Error
}


func (r *userRepository) GetByID(id uuid.UUID) (*domain.User, error) {
	var user domain.User
	if err := r.db.First(&user, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByEmail(email string) (*domain.User, error) {
	var user domain.User
	if err := r.db.First(&user, "email = ?", email).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Update(user *domain.User) error {
	return r.db.Save(user).Error
}
