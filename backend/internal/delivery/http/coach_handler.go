package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
	"github.com/user/superapp/backend/internal/usecase"
)

type CoachHandler struct {
	engine    *usecase.CoachEngine
	coachRepo domain.CoachRepository
}

func NewCoachHandler(app *fiber.App, engine *usecase.CoachEngine, repo domain.CoachRepository) {
	handler := &CoachHandler{
		engine:    engine,
		coachRepo: repo,
	}

	api := app.Group("/api/v1")
	api.Get("/coach/messages", handler.GetMessages)
	api.Post("/coach/messages/read", handler.MarkAsRead)
	api.Post("/coach/generate", handler.GenerateMessage)
}

func (h *CoachHandler) GetMessages(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	msgs, err := h.coachRepo.GetUnreadByUserID(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": msgs})
}

type MarkReadRequest struct {
	MessageIDs []uuid.UUID `json:"message_ids"`
}

func (h *CoachHandler) MarkAsRead(c *fiber.Ctx) error {
	var req MarkReadRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	if err := h.coachRepo.MarkAsRead(req.MessageIDs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Messages marked as read"})
}

func (h *CoachHandler) GenerateMessage(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	if err := h.engine.GenerateProactiveMessage(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Coach message generated successfully"})
}
