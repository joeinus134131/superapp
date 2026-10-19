package http

import (
	"github.com/gofiber/fiber/v2"
	"io"
	"net/http/httptest"
	"testing"
)

func TestAILanguage(t *testing.T) {
	for _, tc := range []struct{ header, expected string }{
		{"", "English"}, {"en", "English"}, {"id", "Indonesian"},
		{"id-ID,id;q=0.9", "Indonesian"}, {"en-US,id;q=0.8", "English"}, {"fr", "English"},
	} {
		app := fiber.New()
		app.Get("/", func(c *fiber.Ctx) error { return c.SendString(aiLanguage(c)) })
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Accept-Language", tc.header)
		response, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(response.Body)
		response.Body.Close()
		if string(body) != tc.expected {
			t.Errorf("%q: got %s, want %s", tc.header, body, tc.expected)
		}
	}
}

func TestJournalPromptFallback(t *testing.T) {
	for _, language := range []string{"English", "Indonesian"} {
		prompts := journalPromptFallback(language)
		if len(prompts) != 3 {
			t.Fatalf("%s: expected 3 prompts", language)
		}
		for _, prompt := range prompts {
			if prompt == "" {
				t.Fatal("empty prompt")
			}
		}
	}
	if journalPromptFallback("English")[0] == journalPromptFallback("Indonesian")[0] {
		t.Fatal("fallback language did not change")
	}
}
