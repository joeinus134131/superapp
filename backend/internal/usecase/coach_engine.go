package usecase

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
)

type CoachEngine struct {
	aiService *AIService
	ctxRepo   domain.ContextRepository
	coachRepo domain.CoachRepository
}

func NewCoachEngine(ai *AIService, cr domain.ContextRepository, cRepo domain.CoachRepository) *CoachEngine {
	return &CoachEngine{
		aiService: ai,
		ctxRepo:   cr,
		coachRepo: cRepo,
	}
}

func (e *CoachEngine) GenerateProactiveMessage(userID uuid.UUID) error {
	contexts, err := e.ctxRepo.GetByUserID(userID)
	if err != nil {
		return err
	}

	if len(contexts) == 0 {
		log.Printf("No data for user %s to generate coach message", userID)
		return nil
	}

	var sb strings.Builder
	sb.WriteString("User Activity History:\n")
	for i, ctx := range contexts {
		if i > 50 {
			break
		}
		sb.WriteString(fmt.Sprintf("- [%s] %s: %s\n", ctx.EventTimestamp.Format("2006-01-02 15:04"), ctx.ModuleType, string(ctx.DataPayload)))
	}

	prompt := fmt.Sprintf(`You are "SelfOne Coach", a proactive AI assistant for a productivity app.
Look at the user's recent activity. Act as an empathetic, encouraging, and highly observant life coach.
Generate a short notification message to send to the user RIGHT NOW.
If they are doing great, praise them. If they are slacking or overspending, give a gentle warning or reminder.

Return ONLY a valid JSON object without markdown formatting.

Format:
{
  "title": "Short catchy title (e.g., 'Awesome Streak! 🚀' or 'Watch your wallet! 💸')",
  "body": "The personalized message (max 2 sentences).",
  "type": "motivation" // can be "motivation", "warning", or "reminder"
}

Data:
%s`, sb.String())

	res, err := e.aiService.CallGroq(prompt)
	if err != nil {
		return err
	}

	res = strings.TrimSpace(res)
	if strings.HasPrefix(res, "```json") {
		res = strings.TrimPrefix(res, "```json")
		res = strings.TrimSuffix(res, "```")
	} else if strings.HasPrefix(res, "```") {
		res = strings.TrimPrefix(res, "```")
		res = strings.TrimSuffix(res, "```")
	}

	var parsed struct {
		Title string `json:"title"`
		Body  string `json:"body"`
		Type  string `json:"type"`
	}

	if err := json.Unmarshal([]byte(res), &parsed); err != nil {
		return fmt.Errorf("failed to parse AI response: %w (raw: %s)", err, res)
	}

	msg := &domain.CoachMessage{
		UserID: userID,
		Title:  parsed.Title,
		Body:   parsed.Body,
		Type:   parsed.Type,
		IsRead: false,
	}

	return e.coachRepo.Save(msg)
}
