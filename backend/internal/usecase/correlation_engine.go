package usecase

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
)

type CorrelationEngine struct {
	aiService   *AIService
	ctxRepo     domain.ContextRepository
	insightRepo domain.InsightRepository
}

func NewCorrelationEngine(ai *AIService, cr domain.ContextRepository, ir domain.InsightRepository) *CorrelationEngine {
	return &CorrelationEngine{
		aiService:   ai,
		ctxRepo:     cr,
		insightRepo: ir,
	}
}

func (e *CorrelationEngine) GenerateInsightsForUser(userID uuid.UUID) error {
	contexts, err := e.ctxRepo.GetByUserID(userID)
	if err != nil {
		return err
	}

	if len(contexts) < 3 { // lower threshold for testing
		log.Printf("Not enough data to generate insights for user %s", userID)
		return fmt.Errorf("not enough data points to generate insight")
	}

	// Prepare data string
	var sb strings.Builder
	sb.WriteString("User Activity History:\n")
	for i, ctx := range contexts {
		if i > 50 { // limit to last 50 events
			break
		}
		sb.WriteString(fmt.Sprintf("- [%s] %s: %s\n", ctx.EventTimestamp.Format("2006-01-02 15:04"), ctx.ModuleType, string(ctx.DataPayload)))
	}

	prompt := fmt.Sprintf(`You are a Cross-Module Intelligence Engine for a productivity app. 
Analyze the following user activity history across different modules (finance, tasks, habits, journal, etc.).
Find 1 interesting correlation, pattern, or actionable insight.
Return ONLY a valid JSON object without markdown formatting.

Format:
{
  "insight_type": "correlation", // can be "correlation", "warning", or "praise"
  "content": "You tend to overspend on food on days when you don't complete your 'Morning Workout' habit. Try keeping the habit to save money!",
  "related_modules": "finance,habits",
  "confidence_score": 85
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
		InsightType    string `json:"insight_type"`
		Content        string `json:"content"`
		RelatedModules string `json:"related_modules"`
		Confidence     int    `json:"confidence_score"`
	}

	if err := json.Unmarshal([]byte(res), &parsed); err != nil {
		return fmt.Errorf("failed to parse AI response: %w (raw: %s)", err, res)
	}

	insight := &domain.Insight{
		UserID:         userID,
		InsightType:    parsed.InsightType,
		Content:        parsed.Content,
		RelatedModules: parsed.RelatedModules,
		Confidence:     parsed.Confidence,
	}

	return e.insightRepo.Save(insight)
}
