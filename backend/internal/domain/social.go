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

type Challenge struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	SquadID   uuid.UUID `gorm:"type:uuid;not null" json:"squad_id"`
	Title     string    `gorm:"not null" json:"title"`
	Type      string    `json:"type"`   // "habit", "reading", "fitness", etc.
	Target    int       `json:"target"` // 30 days, 5 books, etc.
	StakeXP   int       `json:"stake_xp"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
}

type ChallengeProgress struct {
	ChallengeID uuid.UUID `gorm:"type:uuid;primaryKey" json:"challenge_id"`
	UserID      uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`
	Current     int       `json:"current"`
	IsCompleted bool      `gorm:"default:false" json:"is_completed"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type SocialRepository interface {
	GetGlobalLeaderboard(limit int) ([]LeaderboardEntry, error)
	UpdateUserStats(entry LeaderboardEntry) error
	GetSquadsByUserID(userID uuid.UUID) ([]Squad, error)
	CreateSquad(squad *Squad) error
	CreateChallenge(challenge *Challenge) error
	GetChallengesBySquad(squadID uuid.UUID) ([]Challenge, error)
	UpdateChallengeProgress(progress *ChallengeProgress) error
	GetChallengeProgress(challengeID uuid.UUID) ([]ChallengeProgress, error)
}

type SocialUsecase interface {
	GetLeaderboard() ([]LeaderboardEntry, error)
	GetMySquads(userID uuid.UUID) ([]Squad, error)
	CreateNewSquad(userID uuid.UUID, name, desc string) (*Squad, error)
	CreateChallenge(squadID uuid.UUID, title, challengeType string, target, stakeXP int, startDate, endDate time.Time) (*Challenge, error)
	GetSquadChallenges(squadID uuid.UUID) ([]Challenge, error)
	UpdateProgress(challengeID, userID uuid.UUID, increment int) (*ChallengeProgress, error)
}
