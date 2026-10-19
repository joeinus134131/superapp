package finance

import (
	"github.com/golang-jwt/jwt/v5"
	"strings"
	"testing"
	"time"
)

func TestDelegatedClaims(t *testing.T) {
	now := time.Now()
	secret := []byte(strings.Repeat("s", 32))
	raw, err := signDelegation(secret, accountID, connectionID, "research:read", now)
	if err != nil {
		t.Fatal(err)
	}
	token, err := jwt.Parse(raw, func(t *jwt.Token) (interface{}, error) { return secret, nil }, jwt.WithValidMethods([]string{"HS256"}), jwt.WithIssuer("superapp"), jwt.WithAudience("finlab"), jwt.WithExpirationRequired())
	if err != nil {
		t.Fatal(err)
	}
	claims := token.Claims.(jwt.MapClaims)
	if claims["sub"] != accountID || claims["entity_id"] != connectionID || claims["scope"] != "research:read" {
		t.Fatal("scope mismatch")
	}
	exp, _ := claims.GetExpirationTime()
	if exp.Time.Sub(now) > 3*time.Minute {
		t.Fatal("TTL too long")
	}
}
