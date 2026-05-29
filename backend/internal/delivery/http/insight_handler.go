package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
	"github.com/user/superapp/backend/internal/usecase"
)

type InsightHandler struct {
	engine      *usecase.CorrelationEngine
	insightRepo domain.InsightRepository
}

func NewInsightHandler(app *fiber.App, engine *usecase.CorrelationEngine, repo domain.InsightRepository) {
	handler := &InsightHandler{
		engine:      engine,
		insightRepo: repo,
	}

	api := app.Group("/api/v1")
	api.Get("/insights", handler.GetInsights)
	api.Post("/insights/generate", handler.GenerateInsights)
}

func (h *InsightHandler) GetInsights(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	insights, err := h.insightRepo.GetByUserID(userID, 5)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": insights})
}

func (h *InsightHandler) GenerateInsights(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	if err := h.engine.GenerateInsightsForUser(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Insight generated successfully"})
}
