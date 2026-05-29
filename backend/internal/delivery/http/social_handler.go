package http

import (
	"time"

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
	social.Post("/squads/:id/challenges", handler.CreateChallenge)
	social.Get("/squads/:id/challenges", handler.GetChallenges)
	social.Post("/challenges/:id/progress", handler.UpdateProgress)
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

func (h *SocialHandler) CreateChallenge(c *fiber.Ctx) error {
	squadIDStr := c.Params("id")
	squadID, err := uuid.Parse(squadIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid squad ID"})
	}

	var req struct {
		Title     string `json:"title"`
		Type      string `json:"type"`
		Target    int    `json:"target"`
		StakeXP   int    `json:"stake_xp"`
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	startDate, _ := time.Parse(time.RFC3339, req.StartDate)
	endDate, _ := time.Parse(time.RFC3339, req.EndDate)

	challenge, err := h.usecase.CreateChallenge(squadID, req.Title, req.Type, req.Target, req.StakeXP, startDate, endDate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": challenge})
}

func (h *SocialHandler) GetChallenges(c *fiber.Ctx) error {
	squadIDStr := c.Params("id")
	squadID, err := uuid.Parse(squadIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid squad ID"})
	}

	challenges, err := h.usecase.GetSquadChallenges(squadID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"data": challenges})
}

func (h *SocialHandler) UpdateProgress(c *fiber.Ctx) error {
	challengeIDStr := c.Params("id")
	challengeID, err := uuid.Parse(challengeIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid challenge ID"})
	}

	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	var req struct {
		Increment int `json:"increment"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	progress, err := h.usecase.UpdateProgress(challengeID, userID, req.Increment)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"data": progress})
}
