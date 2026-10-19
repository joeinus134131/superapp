package http

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
	"github.com/user/superapp/backend/internal/repository"
)

type storageTestRepo struct {
	owner    uuid.UUID
	items    []domain.UserData
	conflict bool
}

func (r *storageTestRepo) Migrate(owner uuid.UUID, _ string, items []domain.UserData) (*domain.MigrationResult, error) {
	if r.conflict {
		return nil, repository.ErrMigrationConflict
	}
	r.owner, r.items = owner, items
	return &domain.MigrationResult{Status: "completed", Imported: len(items)}, nil
}
func (r *storageTestRepo) List(owner uuid.UUID) ([]domain.UserData, error) {
	r.owner = owner
	return r.items, nil
}

func TestStorageHTTPContract(t *testing.T) {
	owner := uuid.New()
	item := domain.MigrationItem{StorageKey: "superapp_tasks", Payload: json.RawMessage(`[{"id":"legacy","title":"Tugas 日本語"}]`), Revision: 1, SchemaVersion: 1, ClientUpdatedAt: time.Now().UTC()}
	sum := sha256.Sum256(item.Payload)
	item.Checksum = hex.EncodeToString(sum[:])
	for _, scenario := range []struct {
		name                    string
		checksum                string
		conflict, authenticated bool
		status                  int
	}{
		{"valid payload", item.Checksum, false, true, 200},
		{"checksum rejected", "bad", false, true, 422},
		{"conflict surfaced", item.Checksum, true, true, 409},
		{"unauthenticated", item.Checksum, false, false, 401},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			repo := &storageTestRepo{conflict: scenario.conflict}
			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				if scenario.authenticated {
					c.Locals("user_id", owner.String())
				}
				return c.Next()
			})
			NewStorageHandler(app, repo)
			candidate := item
			candidate.Checksum = scenario.checksum
			body, err := json.Marshal(domain.MigrationRequest{IdempotencyKey: "http-test", Items: []domain.MigrationItem{candidate}})
			if err != nil {
				t.Fatal(err)
			}
			request := httptest.NewRequest("POST", "/storage/migrations", bytes.NewReader(body))
			request.Header.Set("Content-Type", "application/json")
			response, err := app.Test(request)
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			if response.StatusCode != scenario.status {
				t.Fatalf("status = %d, want %d", response.StatusCode, scenario.status)
			}
			if scenario.status == 200 {
				if repo.owner != owner {
					t.Fatal("authenticated identity not used")
				}
				result, err := app.Test(httptest.NewRequest("GET", "/storage", nil))
				if err != nil {
					t.Fatal(err)
				}
				defer result.Body.Close()
				var stored struct {
					Items []domain.UserData `json:"items"`
				}
				if err := json.NewDecoder(result.Body).Decode(&stored); err != nil {
					t.Fatal(err)
				}
				if len(stored.Items) != 1 || stored.Items[0].Checksum != item.Checksum {
					t.Fatal("readback mismatch")
				}
			}
		})
	}
}
