package http

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/user/superapp/backend/internal/usecase"
)

type ParseHandler struct {
	aiService *usecase.AIService
}

func NewParseHandler(app *fiber.App, ai *usecase.AIService) {
	handler := &ParseHandler{aiService: ai}
	api := app.Group("/api/v1")
	api.Post("/parse", handler.ParseNLP)
}

type ParseRequest struct {
	Text string `json:"text"`
}

func (h *ParseHandler) ParseNLP(c *fiber.Ctx) error {
	var req ParseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	prompt := fmt.Sprintf(`You are a data extraction AI.
CRITICAL INSTRUCTION: Return ONLY a raw JSON object. DO NOT write code. DO NOT write python. DO NOT explain. DO NOT use markdown.
Extract data from the text and categorize it into one of these modules: 'finance', 'task', 'journal', 'health'.

Examples:
Input: "habis beli kopi 35rb di sbux"
Output: {"module": "finance", "data": {"type": "expense", "amount": 35000, "category": "food", "note": "beli kopi di sbux"}}

Input: "besok meeting jam 2 siang"
Output: {"module": "task", "data": {"title": "meeting", "date": "tomorrow 14:00"}}

Input: "hari ini capek banget kerjaan numpuk"
Output: {"module": "journal", "data": {"entry": "hari ini capek banget kerjaan numpuk"}}

Input: "%s"
Output:`, req.Text)

	res, err := h.aiService.CallGroqJSON(prompt)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	res = strings.TrimSpace(res)
	if strings.HasPrefix(res, "```json") {
		res = strings.TrimPrefix(res, "```json")
		res = strings.TrimSuffix(res, "```")
	} else if strings.HasPrefix(res, "```") {
		res = strings.TrimPrefix(res, "```")
		res = strings.TrimSuffix(res, "```")
	}
	res = strings.TrimSpace(res)

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(res), &parsed); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse AI response", "raw": res})
	}

	return c.JSON(parsed)
}
