package http

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/user/superapp/backend/internal/usecase"
)

// AI output follows the requested interface language; English is the default.
func aiLanguage(c *fiber.Ctx) string {
	if strings.EqualFold(strings.Split(strings.Split(c.Get("Accept-Language"), ",")[0], ";")[0], "id") || strings.HasPrefix(strings.ToLower(c.Get("Accept-Language")), "id-") {
		return "Indonesian"
	}
	return "English"
}

func journalPromptFallback(language string) []string {
	if language == "Indonesian" {
		return []string{"Apa pencapaian terbaikmu hari ini?", "Apa tantangan terbesar yang kamu hadapi?", "Satu hal yang kamu syukuri hari ini?"}
	}
	return []string{"What was your best achievement today?", "What was the biggest challenge you faced?", "What is one thing you are grateful for today?"}
}

type AIHandler struct {
	aiService *usecase.AIService
}

func NewAIHandler(router fiber.Router, ai *usecase.AIService) {
	handler := &AIHandler{aiService: ai}
	router.Post("/ai/insights", handler.GetInsights)
	router.Post("/ai/journal", handler.AnalyzeJournal)
	router.Post("/ai/prompts", handler.GetJournalPrompts)
}

func (h *AIHandler) GetInsights(c *fiber.Ctx) error {
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	contextJSON, _ := json.Marshal(body)

	systemPrompt := `You are an AI life coach analyzing personal productivity metrics.
Analyze the user context and provide actionable, encouraging insights.
Return ONLY a valid JSON object matching this schema:
{
  "insights": [
    {
      "id": "insight-1",
      "title": "Short punchy title",
      "msg": "Encouraging advice under 25 words",
      "icon": "stars|timer|trending-up|local-fire-department",
      "color": "#8b5cf6|#10b981|#3b82f6|#f59e0b",
      "type": "TASK|HABIT|FINANCE|FOCUS",
      "xpMultiplier": 1.0
    }
  ]
}`

	userPrompt := fmt.Sprintf("User Activity Context: %s", string(contextJSON))
	prompt := fmt.Sprintf("%s\nWrite all user-facing text in %s. Keep JSON keys and enum values unchanged.\n\n%s", systemPrompt, aiLanguage(c), userPrompt)

	res, err := h.aiService.CallGroqJSON(prompt)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "AI service unavailable"})
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(res), &parsed); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse AI response"})
	}

	insights, ok := parsed["insights"]
	if !ok {
		insights = []interface{}{}
	}

	return c.JSON(fiber.Map{"data": insights})
}

func (h *AIHandler) AnalyzeJournal(c *fiber.Ctx) error {
	var req struct {
		Content string `json:"content"`
	}
	if err := c.BodyParser(&req); err != nil || req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Journal content is required"})
	}

	prompt := fmt.Sprintf(`You are an empathetic, insightful life coach.
Analyze the following journal entry:
"%s"

Return ONLY a JSON object with this exact schema:
{
  "mood": "great|positive|neutral|stressed|tired",
  "reflection": "One punchy sentence of actionable encouragement under 25 words in %s."
}`, req.Content, aiLanguage(c))

	res, err := h.aiService.CallGroqJSON(prompt)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "AI service unavailable"})
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(res), &parsed); err != nil {
		return c.JSON(fiber.Map{
			"mood":       "neutral",
			"reflection": map[string]string{"English": "Keep going and keep recording your daily reflections!", "Indonesian": "Tetap semangat dan terus catat refleksi harianmu!"}[aiLanguage(c)],
		})
	}

	return c.JSON(parsed)
}

func (h *AIHandler) GetJournalPrompts(c *fiber.Ctx) error {
	language := aiLanguage(c)
	prompt := fmt.Sprintf(`Generate 3 short reflection questions for an evening journal in %s.
Return ONLY a valid JSON object with a "prompts" array of three strings.`, language)

	res, err := h.aiService.CallGroqJSON(prompt)
	if err != nil {
		return c.JSON(fiber.Map{
			"prompts": journalPromptFallback(language),
		})
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(res), &parsed); err != nil {
		return c.JSON(fiber.Map{
			"prompts": journalPromptFallback(language),
		})
	}

	return c.JSON(parsed)
}
