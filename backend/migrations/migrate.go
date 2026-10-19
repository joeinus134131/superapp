// Package migrations applies the embedded schema in version order.
package migrations

import (
	"crypto/sha256"
	"embed"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

//go:embed *.up.sql
var scripts embed.FS

// Apply supports new installations and databases already managed by this runner.
// Existing untracked databases must be reconciled explicitly, never auto-baselined.
func Apply(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(7261942301)").Error; err != nil {
			return err
		}
		var tracked bool
		if err := tx.Raw("SELECT to_regclass('public.whenya_schema_migrations') IS NOT NULL").Scan(&tracked).Error; err != nil {
			return err
		}
		if !tracked {
			var count int64
			if err := tx.Raw("SELECT count(*) FROM pg_tables WHERE schemaname = 'public'").Scan(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return fmt.Errorf("existing untracked database: back up and reconcile schema before using this migration runner")
			}
		}
		if err := tx.Exec(`CREATE TABLE IF NOT EXISTS whenya_schema_migrations (
   version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
  )`).Error; err != nil {
			return err
		}
		entries, err := scripts.ReadDir(".")
		if err != nil {
			return err
		}
		for _, entry := range entries {
			name := entry.Name()
			raw, err := scripts.ReadFile(name)
			if err != nil {
				return err
			}
			checksum := fmt.Sprintf("%x", sha256.Sum256(raw))
			var previous []struct{ Checksum string }
			if err := tx.Raw("SELECT checksum FROM whenya_schema_migrations WHERE version = ?", name).Scan(&previous).Error; err != nil {
				return err
			}
			if len(previous) > 0 {
				if previous[0].Checksum != checksum {
					return fmt.Errorf("migration checksum changed: %s", name)
				}
				continue
			}
			// Legacy SQL files have outer transaction markers. This runner owns the
			// transaction so schema changes and the ledger always commit together.
			lines := strings.Split(string(raw), "\n")
			for i, line := range lines {
				switch strings.ToUpper(strings.TrimSpace(line)) {
				case "BEGIN;", "COMMIT;":
					lines[i] = ""
				}
			}
			if err := tx.Exec(strings.Join(lines, "\n")).Error; err != nil {
				return fmt.Errorf("migration %s: %w", name, err)
			}
			if err := tx.Exec("INSERT INTO whenya_schema_migrations(version, checksum) VALUES (?, ?)", name, checksum).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
