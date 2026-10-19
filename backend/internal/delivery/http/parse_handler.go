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

func NewParseHandler(router fiber.Router, ai *usecase.AIService) {
	handler := &ParseHandler{aiService: ai}
	router.Post("/parse", handler.ParseNLP)
}

type ParseRequest struct {
	Text string `json:"text"`
}

func (h *ParseHandler) ParseNLP(c *fiber.Ctx) error {
	var req ParseRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Text) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Valid text is required"})
	}

	encodedText, err := json.Marshal(req.Text)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Failed to encode input text"})
	}

	prompt := fmt.Sprintf(`You are a data extraction AI.
CRITICAL INSTRUCTION: Return ONLY a raw JSON object with keys "module" ('finance'|'task'|'journal'|'health') and "data". DO NOT explain. DO NOT wrap with anything other than valid JSON.

Examples:
Input: "habis beli kopi 35rb di sbux"
Output: {"module": "finance", "data": {"type": "expense", "amount": 35000, "category": "food", "note": "beli kopi di sbux"}}

Input: "besok meeting jam 2 siang"
Output: {"module": "task", "data": {"title": "meeting", "date": "tomorrow 14:00"}}

Input: "hari ini capek banget kerjaan numpuk"
Output: {"module": "journal", "data": {"entry": "hari ini capek banget kerjaan numpuk"}}

User Input: %s
Output:`, string(encodedText))

	res, err := h.aiService.CallGroqJSON(prompt)
	if err != nil {
		// Fallback to local deterministic pattern extraction when AI service is unavailable
		lower := strings.ToLower(req.Text)
		if strings.Contains(lower, "beli") || strings.Contains(lower, "bayar") || strings.Contains(lower, "rp") || strings.Contains(lower, "ribu") {
			return c.JSON(fiber.Map{
				"module": "finance",
				"data": fiber.Map{
					"type":     "expense",
					"amount":   25000,
					"category": "other",
					"note":     req.Text,
				},
			})
		}
		if strings.Contains(lower, "capek") || strings.Contains(lower, "syukur") || strings.Contains(lower, "senang") || strings.Contains(lower, "curhat") {
			return c.JSON(fiber.Map{
				"module": "journal",
				"data": fiber.Map{
					"entry": req.Text,
				},
			})
		}
		// Default to task
		return c.JSON(fiber.Map{
			"module": "task",
			"data": fiber.Map{
				"title": req.Text,
			},
		})
	}

	cleanJSON := strings.TrimSpace(res)
	if strings.HasPrefix(cleanJSON, "```") {
		cleanJSON = strings.TrimPrefix(cleanJSON, "```json")
		cleanJSON = strings.TrimPrefix(cleanJSON, "```")
		cleanJSON = strings.TrimSuffix(cleanJSON, "```")
		cleanJSON = strings.TrimSpace(cleanJSON)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(cleanJSON), &parsed); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse structured output"})
	}

	return c.JSON(parsed)
}
