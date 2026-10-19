package migrations

import (
	"errors"
	"github.com/user/superapp/backend/internal/domain"
	"gorm.io/gorm/schema"
	"os"
	"strings"
	"sync"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Use a dedicated empty disposable database; never fall back to DATABASE_URL.
func TestApplyPostgres(t *testing.T) {
	dsn := os.Getenv("MIGRATIONS_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set MIGRATIONS_TEST_DATABASE_URL to an empty disposable database")
	}
	db, err := gorm.Open(postgres.New(postgres.Config{DSN: dsn, PreferSimpleProtocol: true}), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()
	var tables int64
	if err := db.Raw("SELECT count(*) FROM pg_tables WHERE schemaname='public'").Scan(&tables).Error; err != nil {
		t.Fatal(err)
	}
	if tables != 0 {
		t.Fatal("migration tests require an empty public schema")
	}
	rollback := errors.New("test rollback")
	t.Run("fresh install repeat and checksum guard", func(t *testing.T) {
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := Apply(tx); err != nil {
				t.Fatal(err)
			}
			if err := Apply(tx); err != nil {
				t.Fatal(err)
			}
			var count int64
			tx.Table("whenya_schema_migrations").Count(&count)
			if count != 8 {
				t.Fatalf("applied %d migrations, want 8", count)
			}
			for _, table := range []string{"users", "user_contexts", "challenge_progresses", "user_data", "journal_entries", "source_documents"} {
				if !tx.Migrator().HasTable(table) {
					t.Fatalf("missing table %s", table)
				}
			}
			// The fixed baseline must satisfy the current application models.
			for _, model := range []interface{}{&domain.User{}, &domain.UserContext{}, &domain.LeaderboardEntry{}, &domain.Squad{}, &domain.Insight{}, &domain.CoachMessage{}, &domain.UserData{}, &domain.DataMigration{}, &domain.Challenge{}, &domain.ChallengeProgress{}} {
				parsed, err := schema.Parse(model, &sync.Map{}, schema.NamingStrategy{})
				if err != nil {
					t.Fatal(err)
				}
				for _, column := range parsed.DBNames {
					if !tx.Migrator().HasColumn(parsed.Table, column) {
						t.Fatalf("missing application column %s.%s", parsed.Table, column)
					}
				}
			}
			// Exercise fields used by user provisioning and storage.
			if err := tx.Exec(`INSERT INTO users(id,email,name,"createdAt","updatedAt") VALUES ('00000000-0000-0000-0000-000000000001','test@example.com','Test',now(),now())`).Error; err != nil {
				t.Fatal(err)
			}
			tx.Exec("UPDATE whenya_schema_migrations SET checksum='changed' WHERE version='000000_core.up.sql'")
			if err := Apply(tx); err == nil || !strings.Contains(err.Error(), "checksum changed") {
				t.Fatalf("checksum guard: %v", err)
			}
			return rollback
		})
		if !errors.Is(err, rollback) {
			t.Fatal(err)
		}
	})
	t.Run("failed migration rolls back schema and ledger", func(t *testing.T) {
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec("CREATE TABLE whenya_schema_migrations(version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())").Error; err != nil {
				t.Fatal(err)
			}
			if err := tx.Exec("CREATE TABLE finance_entities(id integer)").Error; err != nil {
				t.Fatal(err)
			}
			if err := Apply(tx); err == nil {
				t.Fatal("expected migration failure on conflicting finance table")
			}
			if tx.Migrator().HasTable("users") {
				t.Fatal("failed migration leaked core tables")
			}
			var count int64
			if err := tx.Table("whenya_schema_migrations").Count(&count).Error; err != nil {
				t.Fatal(err)
			}
			if count != 0 {
				t.Fatal("failed migration leaked ledger records")
			}
			return rollback
		})
		if !errors.Is(err, rollback) {
			t.Fatal(err)
		}
	})
	t.Run("refuse untracked schema", func(t *testing.T) {
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec("CREATE TABLE existing_data (id integer)").Error; err != nil {
				t.Fatal(err)
			}
			if err := Apply(tx); err == nil || !strings.Contains(err.Error(), "untracked database") {
				t.Fatalf("existing schema guard: %v", err)
			}
			if tx.Migrator().HasTable("whenya_schema_migrations") {
				t.Fatal("refused migration must not create ledger")
			}
			return rollback
		})
		if !errors.Is(err, rollback) {
			t.Fatal(err)
		}
	})
}
