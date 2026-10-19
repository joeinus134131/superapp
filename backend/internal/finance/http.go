package finance

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"io"
	"strings"
)

const MaxPayload = 1024 * 1024

func digest(b []byte) string { h := sha256.Sum256(b); return hex.EncodeToString(h[:]) }
func failure(c *fiber.Ctx, status int, code, msg string) error {
	id := c.Get("X-Request-ID")
	if !canonicalUUID(id) {
		id = uuid.NewString()
	}
	c.Set("X-Request-ID", id)
	return c.Status(status).JSON(fiber.Map{"error": fiber.Map{"code": code, "message": msg, "request_id": id}})
}

// RegisterIntegration must be mounted before the user JWT group. Integration
// credentials are opaque, separately provisioned, connection-scoped tokens.
func RegisterIntegration(router fiber.Router, s Store) {
	auth := func(c *fiber.Ctx) error {
		raw := strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
		if raw == c.Get("Authorization") || len(raw) < 32 || len(raw) > 512 {
			return failure(c, 401, "invalid_connection", "Invalid connection credential")
		}
		conn, err := s.Connection(digest([]byte(raw)))
		if errors.Is(err, ErrUnauthorized) {
			return failure(c, 401, "invalid_connection", "Invalid connection credential")
		}
		if err != nil {
			return failure(c, 503, "storage_unavailable", "Finance storage unavailable")
		}
		c.Locals("finance_connection", conn)
		return c.Next()
	}
	router.Post("/api/v1/finance/import-events", auth, func(c *fiber.Ctx) error {
		if len(c.Body()) > MaxPayload {
			return failure(c, 413, "payload_too_large", "Maximum payload is 1 MiB")
		}
		if !strings.HasPrefix(strings.ToLower(c.Get("Content-Type")), "application/json") {
			return failure(c, 415, "unsupported_media_type", "JSON required")
		}
		key := c.Get("Idempotency-Key")
		if strings.TrimSpace(key) == "" || len(key) > 128 {
			return failure(c, 400, "invalid_idempotency_key", "Idempotency-Key required, maximum 128 characters")
		}
		var e ImportEvent
		decoder := json.NewDecoder(bytes.NewReader(c.Body()))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&e); err != nil {
			return failure(c, 400, "invalid_event", "Invalid event envelope")
		}
		if decoder.Decode(new(interface{})) != io.EOF {
			return failure(c, 400, "invalid_event", "One JSON object required")
		}
		if err := e.Validate(); err != nil {
			return failure(c, 422, "invalid_document", err.Error())
		}
		conn := c.Locals("finance_connection").(Connection)
		if conn.ID != e.ConnectionID || conn.Provider != e.Provider {
			return failure(c, 403, "connection_scope_mismatch", "Event does not match connection scope")
		}
		// Normalize JSON encoding for whitespace/key-order independent replay hashing.
		body, _ := json.Marshal(e)
		out, err := s.Accept(conn, e, key, digest(body), body)
		if errors.Is(err, ErrConflict) {
			return failure(c, 409, "idempotency_conflict", "Key or source already used with different content")
		}
		if errors.Is(err, ErrUnauthorized) {
			return failure(c, 401, "invalid_connection", "Connection revoked")
		}
		if err != nil {
			return failure(c, 503, "storage_unavailable", "Import was not accepted; retry with the same key")
		}
		return c.Status(202).JSON(out)
	})
	router.Get("/api/v1/finance/imports/:id", auth, func(c *fiber.Ctx) error {
		if !canonicalUUID(c.Params("id")) {
			return failure(c, 404, "import_not_found", "Import not found")
		}
		out, err := s.Status(c.Locals("finance_connection").(Connection), c.Params("id"))
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return failure(c, 404, "import_not_found", "Import not found")
		}
		if err != nil {
			return failure(c, 503, "storage_unavailable", "Finance storage unavailable")
		}
		return c.JSON(out)
	})
}
