package repository

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"

	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrMigrationConflict = errors.New("migration conflicts with stored revision or replay")

type userDataRepository struct{ db *gorm.DB }

func NewUserDataRepository(db *gorm.DB) domain.UserDataRepository {
	return &userDataRepository{db: db}
}

func (r *userDataRepository) Migrate(userID uuid.UUID, key string, items []domain.UserData) (*domain.MigrationResult, error) {
	type fingerprintItem struct {
		Key      string
		Checksum string
		Revision int64
		Schema   int
	}
	manifest := make([]fingerprintItem, 0, len(items))
	for _, item := range items {
		manifest = append(manifest, fingerprintItem{item.StorageKey, item.Checksum, item.Revision, item.SchemaVersion})
	}
	sort.Slice(manifest, func(i, j int) bool { return manifest[i].Key < manifest[j].Key })
	encoded, _ := json.Marshal(manifest)
	sum := sha256.Sum256(encoded)
	requestHash := hex.EncodeToString(sum[:])
	result := &domain.MigrationResult{Status: "completed"}
	err := r.db.Transaction(func(tx *gorm.DB) error {
		// Serialize migrations for this user, including first writes with no row to lock.
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", userID.String()).Error; err != nil {
			return err
		}
		for _, item := range items {
			var stored domain.UserData
			err := tx.Where("user_id = ? AND storage_key = ?", userID, item.StorageKey).First(&stored).Error
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			if err == nil && stored.Checksum != item.Checksum && stored.Revision >= item.Revision {
				return ErrMigrationConflict
			}
		}
		var existing domain.DataMigration
		err := tx.Where("user_id = ? AND idempotency_key = ?", userID, key).First(&existing).Error
		if err == nil {
			if existing.RequestSHA256 != requestHash || existing.ItemCount != len(items) {
				return ErrMigrationConflict
			}
			for _, item := range items {
				var stored domain.UserData
				if err := tx.Where("user_id = ? AND storage_key = ? AND checksum = ? AND revision = ?", userID, item.StorageKey, item.Checksum, item.Revision).First(&stored).Error; err != nil {
					return ErrMigrationConflict
				}
			}
			result.MigrationID = existing.ID
			result.Skipped = existing.ItemCount
			result.Status = existing.Status
			return nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		migration := domain.DataMigration{
			ID: uuid.New(), UserID: userID, IdempotencyKey: key,
			ItemCount: len(items), Status: "processing", RequestSHA256: requestHash,
		}
		if err := tx.Create(&migration).Error; err != nil {
			return err
		}

		for i := range items {
			items[i].UserID = userID
			items[i].ID = uuid.New()
			query := tx.Clauses(clause.OnConflict{
				Columns: []clause.Column{{Name: "user_id"}, {Name: "storage_key"}},
				DoUpdates: clause.Assignments(map[string]interface{}{
					"payload":           gorm.Expr("EXCLUDED.payload"),
					"schema_version":    gorm.Expr("EXCLUDED.schema_version"),
					"revision":          gorm.Expr("EXCLUDED.revision"),
					"checksum":          gorm.Expr("EXCLUDED.checksum"),
					"client_updated_at": gorm.Expr("EXCLUDED.client_updated_at"),
					"updated_at":        gorm.Expr("CURRENT_TIMESTAMP"),
				}),
				Where: clause.Where{Exprs: []clause.Expression{
					clause.Expr{SQL: "user_data.revision < EXCLUDED.revision"},
				}},
			}).Create(&items[i])
			if query.Error != nil {
				return query.Error
			}
			if query.RowsAffected == 0 {
				result.Skipped++
			} else {
				result.Imported++
			}
		}

		if err := tx.Model(&migration).Update("status", "completed").Error; err != nil {
			return err
		}
		result.MigrationID = migration.ID
		return nil
	})
	return result, err
}

func (r *userDataRepository) List(userID uuid.UUID) ([]domain.UserData, error) {
	var items []domain.UserData
	err := r.db.Where("user_id = ?", userID).Order("storage_key ASC").Find(&items).Error
	return items, err
}
