package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
)

type ContextHandler struct {
	usecase domain.ContextUsecase
}

func NewContextHandler(router fiber.Router, uc domain.ContextUsecase) {
	handler := &ContextHandler{uc}

	// Endpoint Sync
	router.Post("/context/sync", handler.Sync)
	router.Get("/context/sync", handler.GetSync)
}

func (h *ContextHandler) GetSync(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals("user_id").(string)
	if !ok || userIDStr == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	items, err := h.usecase.GetLatestContexts(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"items": items,
	})
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

