package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
)

type ContextHandler struct {
	usecase domain.ContextUsecase
}

func NewContextHandler(app *fiber.App, uc domain.ContextUsecase) {
	handler := &ContextHandler{uc}

	api := app.Group("/api/v1")
	
	// Endpoint Sync
	api.Post("/context/sync", handler.Sync)
}

func (h *ContextHandler) Sync(c *fiber.Ctx) error {
	var req domain.SyncRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	if err := h.usecase.SyncContexts(userID, req.Items); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"message": "Sync processing in background",
		"items_count": len(req.Items),
	})
}
