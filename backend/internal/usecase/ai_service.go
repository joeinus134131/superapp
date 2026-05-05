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
		"model": "llama3-70b-8192",
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}

	return s.request(url, s.GroqKey, payload, "Authorization", "Bearer "+s.GroqKey)
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

	return s.request(url, s.ClaudeKey, payload, "x-api-key", s.ClaudeKey)
}

func (s *AIService) request(url, key string, payload interface{}, authHeader, authValue string) (string, error) {
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
		return "", err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	
	// Sederhanakan output untuk demo
	return fmt.Sprintf("%v", result), nil
}
