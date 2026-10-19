package middleware

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

var allowedAlgorithms = []string{
	"ES256", "ES384", "ES512",
	"RS256", "RS384", "RS512",
	"HS256", "HS384", "HS512",
}

// JWTMiddleware returns a Fiber middleware that verifies JWT access tokens.
// Asymmetric tokens (Supabase ES256/RS256) are verified against the JWKS
// endpoint; HMAC tokens are verified against secret as a fallback. When neither
// is configured the middleware refuses every request.
func JWTMiddleware(secret, jwksURL, issuer, audience string) fiber.Handler {
	if secret == "" && jwksURL == "" {
		return func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Server misconfiguration: no JWT verification method is configured",
			})
		}
	}

	var resolver *JWKSResolver
	if jwksURL != "" {
		resolver = NewJWKSResolver(jwksURL)
	}

	options := []jwt.ParserOption{
		jwt.WithValidMethods(allowedAlgorithms),
		jwt.WithExpirationRequired(),
	}
	if issuer != "" {
		options = append(options, jwt.WithIssuer(issuer))
	}
	if audience != "" {
		options = append(options, jwt.WithAudience(audience))
	}
	parser := jwt.NewParser(options...)

	keyFunc := func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); ok {
			if secret == "" {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		}
		if resolver == nil {
			return nil, jwt.ErrSignatureInvalid
		}
		return resolver.Keyfunc(token)
	}

	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authorization header is required",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := parser.Parse(tokenString, keyFunc)
		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Failed to parse token claims",
			})
		}

		userID, _ := claims.GetSubject()
		if userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Token is missing subject (sub) claim",
			})
		}

		c.Locals("user_id", userID)
		if email, ok := claims["email"].(string); ok && email != "" {
			c.Locals("user_email", email)
		}
		return c.Next()
	}
}

// GetJWTSecret reads the HMAC fallback secret from the environment.
func GetJWTSecret() string {
	return os.Getenv("JWT_SECRET")
}

// GetSupabaseJWKSURL reads the JWKS endpoint used to verify asymmetric tokens.
func GetSupabaseJWKSURL() string {
	return os.Getenv("SUPABASE_JWKS_URL")
}

// GetSupabaseJWTIssuer reads the expected token issuer, if configured.
func GetSupabaseJWTIssuer() string {
	return os.Getenv("SUPABASE_JWT_ISSUER")
}

// GetSupabaseJWTAudience reads the expected token audience, if configured.
func GetSupabaseJWTAudience() string {
	return os.Getenv("SUPABASE_JWT_AUDIENCE")
}
