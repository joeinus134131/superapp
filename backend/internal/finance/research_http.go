package finance

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const maxResearchResponse = 16 * 1024 * 1024

type ResearchConfig struct {
	BaseURL   string
	Secret    []byte
	AllowHTTP bool
}
type researchHandler struct {
	db     *gorm.DB
	base   string
	secret []byte
	client *http.Client
}

// RegisterResearch mounts only user-authenticated routes. Service credentials
// never enter response bodies or headers; FinLab persists jobs under sub+entity.
func RegisterResearch(router fiber.Router, db *gorm.DB, cfg ResearchConfig) error {
	h := &researchHandler{db: db.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)}), secret: cfg.Secret}
	if cfg.BaseURL != "" {
		u, err := url.Parse(cfg.BaseURL)
		if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") || (u.Scheme != "https" && !(u.Scheme == "http" && cfg.AllowHTTP)) || len(cfg.Secret) < 32 {
			return fmt.Errorf("invalid FinLab configuration")
		}
		h.base = strings.TrimRight(cfg.BaseURL, "/")
	}
	h.client = &http.Client{Timeout: 20 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	router.Post("/finance/entities/:entity/research/jobs", h.submit)
	router.Get("/finance/entities/:entity/research/jobs/:id", h.read)
	router.Get("/finance/entities/:entity/research/jobs/:id/report", h.report)
	return nil
}
func ResearchConfigFromEnv() ResearchConfig {
	return ResearchConfig{BaseURL: os.Getenv("FINLAB_BASE_URL"), Secret: []byte(os.Getenv("FINLAB_DELEGATION_SECRET")), AllowHTTP: os.Getenv("FINLAB_ALLOW_INSECURE_HTTP") == "true"}
}

type researchRequest struct {
	SchemaVersion string          `json:"schema_version"`
	AsOf          string          `json:"as_of"`
	Universe      []string        `json:"universe"`
	Analysis      json.RawMessage `json:"analysis"`
	Constraints   json.RawMessage `json:"constraints"`
	MarketData    json.RawMessage `json:"market_data,omitempty"`
	Evidence      json.RawMessage `json:"evidence,omitempty"`
}

func (h *researchHandler) submit(c *fiber.Ctx) error {
	c.Set("Cache-Control", "no-store")
	if len(c.Body()) > MaxPayload {
		return failure(c, 413, "payload_too_large", "Maximum research input is 1 MiB")
	}
	media, _, err := mime.ParseMediaType(c.Get("Content-Type"))
	if err != nil || media != "application/json" {
		return failure(c, 415, "json_required", "JSON required")
	}
	if !canonicalUUID(c.Get("Idempotency-Key")) {
		return failure(c, 400, "invalid_idempotency_key", "UUID Idempotency-Key required")
	}
	var req researchRequest
	dec := json.NewDecoder(bytes.NewReader(c.Body()))
	dec.DisallowUnknownFields()
	if dec.Decode(&req) != nil || dec.Decode(new(interface{})) != io.EOF {
		return failure(c, 422, "invalid_request", "Invalid research request; identity comes from authenticated membership")
	}
	return h.proxy(c, "POST", "/v1/research/jobs", c.Body(), "research:submit", false)
}
func (h *researchHandler) read(c *fiber.Ctx) error   { return h.get(c, false) }
func (h *researchHandler) report(c *fiber.Ctx) error { return h.get(c, true) }
func (h *researchHandler) get(c *fiber.Ctx, report bool) error {
	c.Set("Cache-Control", "no-store")
	if !canonicalUUID(c.Params("id")) {
		return failure(c, 404, "not_found", "Research job not found")
	}
	path := "/v1/research/jobs/" + c.Params("id")
	if report {
		path += "/report"
	}
	return h.proxy(c, "GET", path, nil, "research:read", report)
}
func (h *researchHandler) proxy(c *fiber.Ctx, method, path string, body []byte, scope string, report bool) error {
	var delegated string
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, method == "POST"); err != nil {
			return err
		}
		if h.base == "" {
			return nil
		}
		var err error
		delegated, err = DelegateResearch(tx, h.secret, user(c), c.Params("entity"), scope, time.Now())
		return err
	})
	if err != nil {
		return coreError(c, err)
	}
	if h.base == "" {
		return failure(c, 503, "research_not_configured", "Research service is not configured")
	}
	ctx, cancel := context.WithTimeout(c.UserContext(), 20*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, method, h.base+path, bytes.NewReader(body))
	if err != nil {
		return failure(c, 502, "research_unavailable", "Research service unavailable")
	}
	req.Header.Set("Authorization", "Bearer "+delegated)
	req.Header.Set("Content-Type", "application/json")
	if method == "POST" {
		req.Header.Set("Idempotency-Key", c.Get("Idempotency-Key"))
	}
	req.Header.Set("X-Request-ID", c.Get("X-Request-ID"))
	response, err := h.client.Do(req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return failure(c, 504, "research_timeout", "Research service timed out; retry with the same key")
		}
		return failure(c, 502, "research_unavailable", "Research service unavailable; retry with the same key")
	}
	defer response.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(response.Body, maxResearchResponse+1))
	if err != nil || len(payload) > maxResearchResponse {
		return failure(c, 502, "invalid_research_response", "Invalid research response")
	}
	var data map[string]json.RawMessage
	media, _, err := mime.ParseMediaType(response.Header.Get("Content-Type"))
	if err != nil || media != "application/json" || json.Unmarshal(payload, &data) != nil || data == nil {
		return failure(c, 502, "invalid_research_response", "Invalid research response")
	}
	if response.StatusCode >= 400 {
		// Preserve safe documented domain status/code, never arbitrary upstream text.
		if response.StatusCode == 401 || response.StatusCode == 403 {
			return failure(c, 502, "research_delegation_rejected", "Research delegation was rejected")
		}
		allowed := map[int]bool{404: true, 409: true, 413: true, 415: true, 422: true, 429: true, 503: true}
		if !allowed[response.StatusCode] {
			return failure(c, 502, "research_unavailable", "Research service unavailable")
		}
		var envelope struct {
			Error struct {
				Code string `json:"code"`
			} `json:"error"`
		}
		json.Unmarshal(payload, &envelope)
		code := envelope.Error.Code
		if !regexp.MustCompile(`^[a-z][a-z0-9_]{0,79}$`).MatchString(code) {
			code = "research_error"
		}
		return failure(c, response.StatusCode, code, strings.ReplaceAll(code, "_", " "))
	}
	expected := 200
	if method == "POST" {
		expected = 202
	}
	if response.StatusCode != expected || !validResearchResponse(data, report, c.Params("id")) {
		return failure(c, 502, "invalid_research_response", "Invalid research response")
	}
	// Only documented JSON is forwarded. Authorization/cookie/redirect headers are discarded.
	return c.Status(response.StatusCode).Type("json").Send(payload)
}
func validResearchResponse(data map[string]json.RawMessage, report bool, id string) bool {
	var schema string
	if json.Unmarshal(data["schema_version"], &schema) != nil || schema != "1" {
		return false
	}
	if report {
		var executed bool
		var sources []map[string]interface{}
		var limitations []string
		var asOf string
		return json.Unmarshal(data["rl_executed"], &executed) == nil && string(data["rl_executed"]) != "null" && json.Unmarshal(data["sources"], &sources) == nil && sources != nil && json.Unmarshal(data["limitations"], &limitations) == nil && limitations != nil && json.Unmarshal(data["data_as_of"], &asOf) == nil && asOf != ""
	}
	var job, state string
	if json.Unmarshal(data["job_id"], &job) != nil || !canonicalUUID(job) || (id != "" && job != id) || json.Unmarshal(data["state"], &state) != nil {
		return false
	}
	return state == "queued" || state == "running" || state == "completed" || state == "failed"
}
