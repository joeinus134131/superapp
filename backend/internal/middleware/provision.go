package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
)

// ProvisionUser guarantees a `users` row exists for the authenticated JWT
// subject before downstream handlers touch tables that reference users(id).
func ProvisionUser(uc domain.UserUsecase) fiber.Handler {
	return func(c *fiber.Ctx) error {
		value, ok := c.Locals("user_id").(string)
		if !ok || strings.TrimSpace(value) == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid authenticated user"})
		}
		userID, err := uuid.Parse(value)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid authenticated user"})
		}

		email, _ := c.Locals("user_email").(string)
		if err := uc.EnsureUser(userID, email); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not provision user"})
		}
		return c.Next()
	}
}
