package repository

import (
	"encoding/json"
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"os"
	"testing"
	"time"
)

func TestMigrationConflicts(t *testing.T) {
	dsn := os.Getenv("FINANCE_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("dedicated PostgreSQL required")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()
	sqlDB.SetMaxOpenConns(1)
	schema := "storage_test_" + uuid.NewString()[:8]
	if err = db.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatal(err)
	}
	defer db.Exec("DROP SCHEMA " + schema + " CASCADE")
	db.Exec("SET search_path TO " + schema)
	db.Exec("CREATE TABLE users(id uuid PRIMARY KEY)")
	for _, file := range []string{"../../migrations/000001_user_data.up.sql", "../../migrations/000003_storage_manifest.up.sql"} {
		b, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		if err = db.Exec(string(b)).Error; err != nil {
			t.Fatal(err)
		}
	}
	user := uuid.New()
	db.Exec("INSERT INTO users(id) VALUES(?)", user)
	repo := NewUserDataRepository(db)
	item := domain.UserData{StorageKey: "superapp_transactions", Payload: json.RawMessage(`{"synthetic":true}`), SchemaVersion: 1, Revision: 1, Checksum: "a", ClientUpdatedAt: time.Now()}
	if _, err = repo.Migrate(user, "one", []domain.UserData{item}); err != nil {
		t.Fatal(err)
	}
	changed := item
	changed.Checksum = "b"
	changed.Payload = json.RawMessage(`{"changed":true}`)
	if _, err = repo.Migrate(user, "two", []domain.UserData{changed}); err != ErrMigrationConflict {
		t.Fatal("equal revision overwritten", err)
	}
	changed.Revision = 2
	if _, err = repo.Migrate(user, "one", []domain.UserData{changed}); err != ErrMigrationConflict {
		t.Fatal("changed replay accepted", err)
	}
	if _, err = repo.Migrate(user, "two", []domain.UserData{changed}); err != nil {
		t.Fatal(err)
	}
	if _, err = repo.Migrate(user, "two", []domain.UserData{changed}); err != nil {
		t.Fatal("exact replay failed", err)
	}
	if _, err = repo.Migrate(user, "three", []domain.UserData{item}); err != ErrMigrationConflict {
		t.Fatal("stale write silently skipped", err)
	}
}
