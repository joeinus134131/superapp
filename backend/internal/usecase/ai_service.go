package usecase

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type AIService struct {
	GroqKey     string
	GroqModel   string
	ClaudeKey   string
	ClaudeModel string
	httpClient  *http.Client
}

func NewAIService() *AIService {
	groqModel := os.Getenv("GROQ_MODEL")
	if groqModel == "" {
		groqModel = "llama-3.3-70b-versatile"
	}

	claudeModel := os.Getenv("CLAUDE_MODEL")
	if claudeModel == "" {
		claudeModel = "claude-3-5-sonnet-20241022"
	}

	return &AIService{
		GroqKey:     os.Getenv("GROQ_API_KEY"),
		GroqModel:   groqModel,
		ClaudeKey:   os.Getenv("CLAUDE_API_KEY"),
		ClaudeModel: claudeModel,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// CallGroq: Cepat dan terstruktur, cocok untuk analisis data & context
func (s *AIService) CallGroq(prompt string) (string, error) {
	url := "https://api.groq.com/openai/v1/chat/completions"
	payload := map[string]interface{}{
		"model": s.GroqModel,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}

	result, err := s.request(url, s.GroqKey, payload, "Authorization", "Bearer "+s.GroqKey)
	if err != nil {
		return "", err
	}

	if choices, ok := result["choices"].([]interface{}); ok && len(choices) > 0 {
		if msg, ok := choices[0].(map[string]interface{})["message"].(map[string]interface{}); ok {
			if content, ok := msg["content"].(string); ok {
				return content, nil
			}
		}
	}
	return "", fmt.Errorf("invalid response format from Groq: %v", result)
}

// CallGroqJSON: Memaksa respon AI dalam bentuk JSON
func (s *AIService) CallGroqJSON(prompt string) (string, error) {
	url := "https://api.groq.com/openai/v1/chat/completions"
	payload := map[string]interface{}{
		"model": s.GroqModel,
		"response_format": map[string]string{
			"type": "json_object",
		},
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}

	result, err := s.request(url, s.GroqKey, payload, "Authorization", "Bearer "+s.GroqKey)
	if err != nil {
		return "", err
	}

	if choices, ok := result["choices"].([]interface{}); ok && len(choices) > 0 {
		if msg, ok := choices[0].(map[string]interface{})["message"].(map[string]interface{}); ok {
			if content, ok := msg["content"].(string); ok {
				return content, nil
			}
		}
	}
	return "", fmt.Errorf("invalid response format from Groq JSON: %v", result)
}

// CallClaude: Model mutakhir untuk insight mendalam & bimbingan personal
func (s *AIService) CallClaude(prompt string) (string, error) {
	url := "https://api.anthropic.com/v1/messages"
	payload := map[string]interface{}{
		"model":      s.ClaudeModel,
		"max_tokens": 1024,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}

	result, err := s.request(url, s.ClaudeKey, payload, "x-api-key", s.ClaudeKey)
	if err != nil {
		return "", err
	}

	if content, ok := result["content"].([]interface{}); ok && len(content) > 0 {
		if text, ok := content[0].(map[string]interface{})["text"].(string); ok {
			return text, nil
		}
	}
	return "", fmt.Errorf("invalid response format from Claude: %v", result)
}

func (s *AIService) request(url, key string, payload interface{}, authHeader, authValue string) (map[string]interface{}, error) {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal payload error: %w", err)
	}

	var lastErr error
	// Retry loop: max 2 attempts with short exponential backoff
	for attempt := 0; attempt < 2; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt*500) * time.Millisecond)
		}

		req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set(authHeader, authValue)

		// Anthropic requires version header
		if authHeader == "x-api-key" {
			req.Header.Set("anthropic-version", "2023-06-01")
		}

		resp, err := s.httpClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		var result map[string]interface{}
		decodeErr := json.NewDecoder(resp.Body).Decode(&result)
		resp.Body.Close()

		if resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("upstream server error %d", resp.StatusCode)
			continue
		}

		if resp.StatusCode >= 400 {
			return nil, fmt.Errorf("AI provider error %d: %v", resp.StatusCode, result)
		}

		if decodeErr != nil {
			return nil, fmt.Errorf("decode response error: %w", decodeErr)
		}

		return result, nil
	}

	return nil, fmt.Errorf("request failed after retries: %w", lastErr)
}
