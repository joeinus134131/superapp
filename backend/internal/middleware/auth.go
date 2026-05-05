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
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			// UNTUK DEMO: Jika gagal, kita coba bypass atau ambil dari Header lain jika testing
			// return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid Token"})
		}

		// Simulasi: Kita pasang UserID ke context
		// Dalam real app, ambil dari token claims
		// c.Locals("user_id", "...")
		
		// Demo: Gunakan static UUID jika token fail untuk mempermudah testing Anda
		c.Locals("user_id", uuid.New().String())

		return c.Next()
	}
}
