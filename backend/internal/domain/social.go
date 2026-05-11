package domain

import (
	"time"
	"github.com/google/uuid"
)

type LeaderboardEntry struct {
	UserID    uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`
	Name      string    `json:"name"`
	Avatar    string    `json:"avatar"`
	Level     int       `json:"level"`
	TotalXP   int       `json:"total_xp"`
	LastSeen  time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"last_seen"`
}

type Squad struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	CreatorID   uuid.UUID `gorm:"type:uuid;not null" json:"creator_id"`
	MemberCount int       `gorm:"default:1" json:"member_count"`
	CreatedAt   time.Time `json:"created_at"`
}

type SocialRepository interface {
	GetGlobalLeaderboard(limit int) ([]LeaderboardEntry, error)
	UpdateUserStats(entry LeaderboardEntry) error
	GetSquadsByUserID(userID uuid.UUID) ([]Squad, error)
	CreateSquad(squad *Squad) error
}

type SocialUsecase interface {
	GetLeaderboard() ([]LeaderboardEntry, error)
	GetMySquads(userID uuid.UUID) ([]Squad, error)
	CreateNewSquad(userID uuid.UUID, name, desc string) (*Squad, error)
}
