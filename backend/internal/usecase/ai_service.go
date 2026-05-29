package usecase

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type AIService struct {
	GroqKey   string
	ClaudeKey string
}

func NewAIService() *AIService {
	return &AIService{
		GroqKey:   os.Getenv("GROQ_API_KEY"),
		ClaudeKey: os.Getenv("CLAUDE_API_KEY"),
	}
}

// CallGroq: Sangat cepat, cocok untuk analisis data keuangan yang banyak
func (s *AIService) CallGroq(prompt string) (string, error) {
	url := "https://api.groq.com/openai/v1/chat/completions"
	payload := map[string]interface{}{
		"model": "llama-3.1-8b-instant",
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
		"model": "llama-3.1-8b-instant",
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

// CallClaude: Sangat pintar, cocok untuk nasihat kesehatan yang personal
func (s *AIService) CallClaude(prompt string) (string, error) {
	url := "https://api.anthropic.com/v1/messages"
	payload := map[string]interface{}{
		"model": "claude-3-sonnet-20240229",
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
	jsonData, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(authHeader, authValue)
	
	// Khusus Anthropic butuh version header
	if authHeader == "x-api-key" {
		req.Header.Set("anthropic-version", "2023-06-01")
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	
	return result, nil
}
