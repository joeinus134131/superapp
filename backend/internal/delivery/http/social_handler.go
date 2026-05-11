package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
)

type SocialHandler struct {
	usecase domain.SocialUsecase
}

func NewSocialHandler(app *fiber.App, uc domain.SocialUsecase) {
	handler := &SocialHandler{uc}

	social := app.Group("/api/v1/social")
	
	social.Get("/leaderboard", handler.GetLeaderboard)
	social.Get("/squads", handler.GetMySquads)
	social.Post("/squads", handler.CreateSquad)
}

func (h *SocialHandler) GetLeaderboard(c *fiber.Ctx) error {
	entries, err := h.usecase.GetLeaderboard()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"data": entries})
}

func (h *SocialHandler) GetMySquads(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	squads, err := h.usecase.GetMySquads(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"data": squads})
}

func (h *SocialHandler) CreateSquad(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	squad, err := h.usecase.CreateNewSquad(userID, req.Name, req.Description)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": squad})
}
