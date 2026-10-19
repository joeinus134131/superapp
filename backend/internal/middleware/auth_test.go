package middleware

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

const testIssuer = "https://example.supabase.co/auth/v1"

func generateECKey(t *testing.T) *ecdsa.PrivateKey {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	return key
}

func jwksBody(t *testing.T, kid string, pub *ecdsa.PublicKey) []byte {
	t.Helper()
	body, err := json.Marshal(map[string]any{
		"keys": []map[string]string{{
			"kty": "EC",
			"crv": "P-256",
			"kid": kid,
			"use": "sig",
			"alg": "ES256",
			"x":   base64.RawURLEncoding.EncodeToString(pub.X.Bytes()),
			"y":   base64.RawURLEncoding.EncodeToString(pub.Y.Bytes()),
		}},
	})
	if err != nil {
		t.Fatalf("marshal jwks: %v", err)
	}
	return body
}

func signES256(t *testing.T, key *ecdsa.PrivateKey, kid string, claims jwt.MapClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = kid
	signed, err := token.SignedString(key)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return signed
}

func baseClaims(exp time.Time) jwt.MapClaims {
	return jwt.MapClaims{
		"sub":   "8f9d4e5a-1c2b-4d3e-9f10-2a3b4c5d6e7f",
		"iss":   testIssuer,
		"aud":   "authenticated",
		"exp":   exp.Unix(),
		"email": "user@example.com",
	}
}

func newTestApp(jwksURL, secret string) *fiber.App {
	app := fiber.New()
	app.Use(JWTMiddleware(secret, jwksURL, testIssuer, "authenticated"))
	app.Get("/protected", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"user_id": c.Locals("user_id"),
			"email":   c.Locals("user_email"),
		})
	})
	return app
}

func doRequest(t *testing.T, app *fiber.App, token string) *http.Response {
	t.Helper()
	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	return response
}

func TestJWTMiddlewareVerifiesES256(t *testing.T) {
	key := generateECKey(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(jwksBody(t, "kid-1", &key.PublicKey))
	}))
	defer server.Close()

	app := newTestApp(server.URL, "")
	token := signES256(t, key, "kid-1", baseClaims(time.Now().Add(time.Hour)))

	response := doRequest(t, app, token)
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", response.StatusCode)
	}
}

func TestJWTMiddlewareRejectsExpired(t *testing.T) {
	key := generateECKey(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write(jwksBody(t, "kid-1", &key.PublicKey))
	}))
	defer server.Close()

	app := newTestApp(server.URL, "")
	token := signES256(t, key, "kid-1", baseClaims(time.Now().Add(-time.Minute)))

	if response := doRequest(t, app, token); response.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for expired token, got %d", response.StatusCode)
	}
}

func TestJWTMiddlewareRejectsWrongKey(t *testing.T) {
	trusted := generateECKey(t)
	attacker := generateECKey(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write(jwksBody(t, "kid-1", &trusted.PublicKey))
	}))
	defer server.Close()

	app := newTestApp(server.URL, "")
	token := signES256(t, attacker, "kid-1", baseClaims(time.Now().Add(time.Hour)))

	if response := doRequest(t, app, token); response.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for wrong key, got %d", response.StatusCode)
	}
}

func TestJWTMiddlewareRefreshesOnUnknownKid(t *testing.T) {
	first := generateECKey(t)
	second := generateECKey(t)

	var mu sync.Mutex
	served := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		mu.Lock()
		served++
		count := served
		mu.Unlock()
		if count == 1 {
			_, _ = w.Write(jwksBody(t, "kid-1", &first.PublicKey))
			return
		}
		_, _ = w.Write(jwksBody(t, "kid-2", &second.PublicKey))
	}))
	defer server.Close()

	app := newTestApp(server.URL, "")
	if response := doRequest(t, app, signES256(t, first, "kid-1", baseClaims(time.Now().Add(time.Hour)))); response.StatusCode != http.StatusOK {
		t.Fatalf("expected warm-up request to succeed, got %d", response.StatusCode)
	}

	response := doRequest(t, app, signES256(t, second, "kid-2", baseClaims(time.Now().Add(time.Hour))))
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected refreshed kid to succeed, got %d", response.StatusCode)
	}
}

func TestJWTMiddlewareHMACFallback(t *testing.T) {
	const secret = "test-secret"
	app := newTestApp("", secret)

	claims := jwt.MapClaims{
		"sub": "8f9d4e5a-1c2b-4d3e-9f10-2a3b4c5d6e7f",
		"iss": testIssuer,
		"aud": "authenticated",
		"exp": time.Now().Add(time.Hour).Unix(),
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("sign hmac token: %v", err)
	}

	if response := doRequest(t, app, token); response.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for hmac fallback, got %d", response.StatusCode)
	}
}

func TestJWTMiddlewareMisconfigured(t *testing.T) {
	app := newTestApp("", "")
	if response := doRequest(t, app, "anything"); response.StatusCode != http.StatusInternalServerError {
		t.Fatalf("expected 500 when unconfigured, got %d", response.StatusCode)
	}
}
