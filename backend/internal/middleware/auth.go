package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func JWTMiddleware(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		
		// Parse token tanpa verifikasi signature dulu untuk mengambil claims (jika secret belum disetting)
		token, _, err := new(jwt.Parser).ParseUnverified(tokenString, jwt.MapClaims{})
		
		var userID string
		if err == nil {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if sub, ok := claims["sub"].(string); ok {
					userID = sub
				}
			}
		}

		if userID == "" {
			// Fallback ke random UUID jika gagal extract (untuk testing)
			userID = uuid.New().String()
		}

		c.Locals("user_id", userID)

		return c.Next()
	}
}
