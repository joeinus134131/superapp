package http

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"github.com/user/superapp/backend/internal/repository"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
)

type StorageHandler struct{ repo domain.UserDataRepository }

func NewStorageHandler(router fiber.Router, repo domain.UserDataRepository) {
	h := &StorageHandler{repo: repo}
	router.Post("/storage/migrations", h.Migrate)
	router.Get("/storage", h.List)
}

func authenticatedUserID(c *fiber.Ctx) (uuid.UUID, error) {
	value, ok := c.Locals("user_id").(string)
	if !ok || strings.TrimSpace(value) == "" {
		return uuid.Nil, fiber.ErrUnauthorized
	}
	return uuid.Parse(value)
}

func (h *StorageHandler) Migrate(c *fiber.Ctx) error {
	var req domain.MigrationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid JSON body"})
	}
	if strings.TrimSpace(req.IdempotencyKey) == "" || len(req.IdempotencyKey) > 128 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "idempotency_key is required (max 128 characters)"})
	}
	if len(req.Items) == 0 || len(req.Items) > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "items must contain 1-100 entries"})
	}
	userID, err := authenticatedUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid authenticated user"})
	}

	items := make([]domain.UserData, 0, len(req.Items))
	seen := make(map[string]bool)
	for _, item := range req.Items {
		item.StorageKey = strings.TrimSpace(item.StorageKey)
		if item.StorageKey == "" || len(item.StorageKey) > 160 || seen[item.StorageKey] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "storage keys must be unique and at most 160 characters"})
		}
		if len(item.Payload) == 0 || len(item.Payload) > 2*1024*1024 {
			return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{"error": "each payload must be valid JSON and at most 2 MB"})
		}
		digest := sha256.Sum256(item.Payload)
		if !strings.EqualFold(item.Checksum, hex.EncodeToString(digest[:])) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "checksum mismatch for " + item.StorageKey})
		}
		if item.SchemaVersion < 1 {
			item.SchemaVersion = 1
		}
		if item.Revision < 1 {
			item.Revision = 1
		}
		if item.ClientUpdatedAt.IsZero() {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "client_updated_at is required for " + item.StorageKey})
		}
		seen[item.StorageKey] = true
		items = append(items, domain.UserData{
			StorageKey: item.StorageKey, Payload: item.Payload, SchemaVersion: item.SchemaVersion,
			Revision: item.Revision, Checksum: strings.ToLower(item.Checksum), ClientUpdatedAt: item.ClientUpdatedAt,
		})
	}

	result, err := h.repo.Migrate(userID, req.IdempotencyKey, items)
	if errors.Is(err, repository.ErrMigrationConflict) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "migration conflicts with stored revision or replay; keep local data and resolve explicitly"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "migration failed"})
	}
	return c.Status(fiber.StatusOK).JSON(result)
}

func (h *StorageHandler) List(c *fiber.Ctx) error {
	userID, err := authenticatedUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid authenticated user"})
	}
	items, err := h.repo.List(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not load data"})
	}
	return c.JSON(fiber.Map{"items": items})
}
