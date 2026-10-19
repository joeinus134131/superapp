package finance

import (
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

// DelegateResearch is backend-only. It verifies live membership immediately
// before issuing a token; callers must never return it to a browser or log it.
func DelegateResearch(db *gorm.DB, secret []byte, userID, entityID, scope string, now time.Time) (string, error) {
	if len(secret) < 32 || !canonicalUUID(userID) || !canonicalUUID(entityID) || (scope != "research:submit" && scope != "research:read") {
		return "", fmt.Errorf("invalid delegation configuration")
	}
	var count int64
	if err := db.Raw("SELECT count(*) FROM entity_memberships WHERE entity_id=? AND user_id=? AND revoked_at IS NULL", entityID, userID).Scan(&count).Error; err != nil {
		return "", err
	}
	if count != 1 {
		return "", ErrUnauthorized
	}
	return signDelegation(secret, userID, entityID, scope, now)
}
func signDelegation(secret []byte, userID, entityID, scope string, now time.Time) (string, error) {
	claims := jwt.MapClaims{"iss": "superapp", "aud": "finlab", "sub": userID, "entity_id": entityID, "scope": scope, "iat": now.Unix(), "exp": now.Add(3 * time.Minute).Unix(), "jti": uuid.NewString()}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}
