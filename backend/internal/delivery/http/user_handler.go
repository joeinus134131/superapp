package http

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
)

type UserHandler struct {
	usecase domain.UserUsecase
}

func NewUserHandler(router fiber.Router, uc domain.UserUsecase) {
	handler := &UserHandler{uc}

	// Endpoint Sync User dari Supabase
	router.Post("/users/sync", handler.SyncUser)
}

type syncUserRequest struct {
	Email  string `json:"email"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

func (h *UserHandler) SyncUser(c *fiber.Ctx) error {
	// Identity always comes from the verified token, never the request body.
	subject, ok := c.Locals("user_id").(string)
	if !ok || strings.TrimSpace(subject) == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid authenticated user"})
	}
	userID, err := uuid.Parse(subject)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid authenticated user"})
	}

	var req syncUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	email := strings.TrimSpace(req.Email)
	if email == "" {
		email, _ = c.Locals("user_email").(string)
	}
	if email == "" {
		email = userID.String() + "@supabase.local"
	}

	user := domain.User{
		ID:     userID,
		Email:  email,
		Name:   req.Name,
		Avatar: req.Avatar,
	}

	if err := h.usecase.RegisterOrUpdate(&user); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "User synced successfully",
		"user_id": user.ID,
	})
}
