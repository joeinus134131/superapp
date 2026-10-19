package finance

import (
	"context"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"mime"
	"os"
	"time"
)

type vaultHandler struct {
	db    *gorm.DB
	vault PrivateVault
}

func RegisterVault(router fiber.Router, db *gorm.DB, vault PrivateVault) {
	h := vaultHandler{db.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)}), vault}
	router.Post("/finance/entities/:entity/documents", h.upload)
	router.Get("/finance/entities/:entity/documents/:id", h.metadata)
	router.Get("/finance/entities/:entity/documents/:id/content", h.download)
}
func VaultFromEnv() (PrivateVault, error) {
	driver := os.Getenv("FINANCE_VAULT_DRIVER")
	if driver == "" {
		return nil, nil
	}
	if driver != "local-private-staging" {
		return nil, errors.New("unsupported private vault driver")
	}
	return NewLocalPrivateVault(os.Getenv("FINANCE_VAULT_LOCAL_ROOT"))
}

type documentMetadata struct {
	ID            string    `json:"document_id"`
	ContentSHA256 string    `json:"content_sha256"`
	Mime          string    `json:"mime"`
	SizeBytes     int       `json:"size_bytes"`
	ObjectKey     string    `json:"-"`
	CreatedAt     time.Time `json:"created_at"`
	StorageDriver string    `json:"storage_driver"`
}

func (h vaultHandler) upload(c *fiber.Ctx) error {
	c.Set("Cache-Control", "no-store")
	key := c.Get("Idempotency-Key")
	mimeType, _, err := mime.ParseMediaType(c.Get("Content-Type"))
	if err != nil || (mimeType != "text/plain" && mimeType != "text/csv" && mimeType != "application/pdf") {
		return failure(c, 415, "unsupported_document_type", "Only plain text, CSV and PDF archive bytes supported")
	}
	data := c.Body()
	if len(data) < 1 || len(data) > MaxDocument {
		return failure(c, 413, "document_size", "Document must be 1 byte to 10 MiB")
	}
	hash := digest(data)
	if !canonicalUUID(key) || c.Get("X-Document-SHA256") != hash {
		return failure(c, 422, "invalid_document", "UUID key and exact byte SHA-256 required")
	}
	id := uuid.NewString()
	object := ""
	stored := false
	duplicate := false
	err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, true); err != nil {
			return err
		}
		if h.vault == nil {
			return errVaultDisabled
		}
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", c.Params("entity")+key).Error; err != nil {
			return err
		}
		var prior documentMetadata
		r := tx.Raw("SELECT id,content_sha256,mime,size_bytes FROM source_documents WHERE entity_id=? AND idempotency_key=?", c.Params("entity"), key).Scan(&prior)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected > 0 {
			if prior.ContentSHA256 != hash || prior.Mime != mimeType {
				return ErrConflict
			}
			id = prior.ID
			duplicate = true
			return nil
		}
		object = documentKey(c.Params("entity"), id)
		if err := h.vault.Put(c.UserContext(), object, data); err != nil {
			return err
		}
		stored = true
		return tx.Exec("INSERT INTO source_documents(id,entity_id,actor_user_id,idempotency_key,content_sha256,mime,size_bytes,object_key,storage_driver) VALUES(?,?,?,?,?,?,?,?,'local-private-staging')", id, c.Params("entity"), user(c), key, hash, mimeType, len(data), object).Error
	})
	if err != nil {
		if stored {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			h.vault.Delete(ctx, object)
		}
		if errors.Is(err, errVaultDisabled) {
			return failure(c, 503, "vault_not_configured", "Private document vault is not configured")
		}
		return coreError(c, err)
	}
	return c.Status(201).JSON(fiber.Map{"schema_version": "1", "document_id": id, "content_sha256": hash, "state": "stored", "duplicate": duplicate, "processing": "not_started"})
}

var errVaultDisabled = errors.New("vault disabled")

func (h vaultHandler) find(c *fiber.Ctx) (documentMetadata, error) {
	var doc documentMetadata
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, false); err != nil {
			return err
		}
		if !canonicalUUID(c.Params("id")) {
			return gorm.ErrRecordNotFound
		}
		r := tx.Raw("SELECT id,content_sha256,mime,size_bytes,object_key,created_at,storage_driver FROM source_documents WHERE entity_id=? AND id=?", c.Params("entity"), c.Params("id")).Scan(&doc)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected != 1 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
	return doc, err
}
func (h vaultHandler) metadata(c *fiber.Ctx) error {
	c.Set("Cache-Control", "no-store")
	doc, err := h.find(c)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return failure(c, 404, "document_not_found", "Document not found")
	}
	if err != nil {
		return coreError(c, err)
	}
	return c.JSON(fiber.Map{"schema_version": "1", "document": doc, "processing": "not_started"})
}
func (h vaultHandler) download(c *fiber.Ctx) error {
	c.Set("Cache-Control", "no-store")
	doc, err := h.find(c)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return failure(c, 404, "document_not_found", "Document not found")
	}
	if err != nil {
		return coreError(c, err)
	}
	if h.vault == nil {
		return failure(c, 503, "vault_not_configured", "Private document vault is not configured")
	}
	data, err := h.vault.Read(c.UserContext(), doc.ObjectKey)
	if err != nil || len(data) != doc.SizeBytes || digest(data) != doc.ContentSHA256 {
		return failure(c, 503, "document_integrity_unavailable", "Document could not be verified")
	}
	c.Set("Content-Type", doc.Mime)
	c.Set("Content-Disposition", `attachment; filename="`+doc.ID+`"`)
	c.Set("X-Content-Type-Options", "nosniff")
	return c.Send(data)
}
