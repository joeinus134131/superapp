package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/user/superapp/backend/internal/domain"
)

type UserHandler struct {
	usecase domain.UserUsecase
}

func NewUserHandler(app *fiber.App, uc domain.UserUsecase) {
	handler := &UserHandler{uc}

	api := app.Group("/api/v1")
	
	// Endpoint Sync User dari Supabase
	api.Post("/users/sync", handler.SyncUser)
}

func (h *UserHandler) SyncUser(c *fiber.Ctx) error {
	var user domain.User
	if err := c.BodyParser(&user); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if err := h.usecase.RegisterOrUpdate(&user); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "User synced successfully",
		"user_id": user.ID,
	})
}
