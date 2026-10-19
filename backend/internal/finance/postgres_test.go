package finance

import (
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"os"
	"sync"
	"testing"
)

// Dedicated disposable database only. No production DATABASE_URL fallback.
func TestPostgresDurability(t *testing.T) {
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
	schema := "finance_test_" + uuid.New().String()[:8]
	if err = db.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatal(err)
	}
	defer db.Exec("DROP SCHEMA " + schema + " CASCADE")
	// Use one connection so search_path is deterministic for this isolated test.
	sqlDB.SetMaxOpenConns(1)
	db.Exec("SET search_path TO " + schema)
	if err = db.Exec("CREATE TABLE users(id uuid PRIMARY KEY)").Error; err != nil {
		t.Fatal(err)
	}
	migration, err := os.ReadFile("../../migrations/000002_finance.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	if err = db.Exec(string(migration)).Error; err != nil {
		t.Fatal(err)
	}
	reviewDDL, err := os.ReadFile("../../migrations/000004_finance_review.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	if err = db.Exec(string(reviewDDL)).Error; err != nil {
		t.Fatal(err)
	}
	extractionDDL, err := os.ReadFile("../../migrations/000005_extraction_runs.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	if err = db.Exec(string(extractionDDL)).Error; err != nil {
		t.Fatal(err)
	}

	planningDDL, err := os.ReadFile("../../migrations/000006_finance_planning.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	if err = db.Exec(string(planningDDL)).Error; err != nil {
		t.Fatal(err)
	}

	user := uuid.NewString()
	entity := uuid.NewString()
	other := uuid.NewString()
	for _, q := range []struct {
		sql  string
		args []interface{}
	}{
		{"INSERT INTO users(id) VALUES(?)", []interface{}{user}},
		{"INSERT INTO finance_entities(id,owner_user_id,kind,display_name,base_currency) VALUES(?,?,'personal','Synthetic','IDR')", []interface{}{entity, user}},
		{"INSERT INTO finance_entities(id,owner_user_id,kind,display_name,base_currency) VALUES(?,?,'business','Synthetic other','IDR')", []interface{}{other, user}},
		{"INSERT INTO integration_connections(id,entity_id,provider,token_sha256,state) VALUES(?,?,'gmail',?,'active')", []interface{}{connectionID, entity, digest([]byte("test"))}},
	} {
		if err = db.Exec(q.sql, q.args...).Error; err != nil {
			t.Fatal(err)
		}
	}
	store := PostgresStore{DB: db}
	conn := Connection{connectionID, entity, "gmail"}
	e := fixture()
	body := []byte(`{"synthetic":true}`)
	var wg sync.WaitGroup
	results := make(chan ImportResult, 8)
	errs := make(chan error, 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r, err := store.Accept(conn, e, "same", digest(body), body)
			results <- r
			errs <- err
		}()
	}
	wg.Wait()
	close(results)
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	id := ""
	fresh := 0
	for r := range results {
		if id != "" && id != r.ImportID {
			t.Fatal("replay changed import")
		}
		id = r.ImportID
		if !r.Duplicate {
			fresh++
		}
	}
	if fresh != 1 {
		t.Fatal("multiple fresh accepts")
	}
	for _, table := range []string{"integration_events", "durable_jobs", "outbox_events"} {
		var n int64
		db.Table(table).Count(&n)
		if n != 1 {
			t.Fatalf("%s count %d", table, n)
		}
	}
	if _, err = store.Status(Connection{connectionID, other, "gmail"}, id); err != gorm.ErrRecordNotFound {
		t.Fatal("cross entity status leak", err)
	}
	if _, err = store.Accept(conn, e, "same", "different", body); err != ErrConflict {
		t.Fatal("changed replay accepted", err)
	}
	// Force the final outbox write to fail; event and job must both roll back.
	db.Exec("ALTER TABLE outbox_events ADD CONSTRAINT fail_test CHECK(false) NOT VALID")
	e.EventID = uuid.NewString()
	e.ProviderMessageID = "new-message"
	if _, err = store.Accept(conn, e, "new", digest(body), body); err == nil {
		t.Fatal("expected failed outbox")
	}
	var count int64
	db.Table("integration_events").Count(&count)
	if count != 1 {
		t.Fatal("event persisted without outbox")
	}
	db.Exec("ALTER TABLE outbox_events DROP CONSTRAINT fail_test")
	for _, a := range []string{accountID, "00000000-0000-4000-8000-000000000004"} {
		if err = db.Exec("INSERT INTO financial_accounts(id,entity_id,kind,display_name,currency) VALUES(?,?,'bank','Synthetic','IDR')", a, entity).Error; err != nil {
			t.Fatal(err)
		}
	}
	post := func(amount string) error {
		return db.Transaction(func(tx *gorm.DB) error {
			entry := uuid.NewString()
			if err := tx.Exec("INSERT INTO journal_entries(id,entity_id,kind,effective_date,idempotency_key,body_sha256) VALUES(?,?,'opening','2026-10-16',?,?)", entry, entity, entry, digest(body)).Error; err != nil {
				return err
			}
			for i, side := range []string{"debit", "credit"} {
				n := "100"
				if i == 1 {
					n = amount
				}
				if err := tx.Exec("INSERT INTO journal_lines(id,entity_id,entry_id,account_id,currency,side,amount) VALUES(?,?,?,?,'IDR',?,?)", uuid.NewString(), entity, entry, accountID, side, n).Error; err != nil {
					return err
				}
			}
			return nil
		})
	}
	if err = post("100"); err != nil {
		t.Fatal(err)
	}
	if post("99") == nil {
		t.Fatal("unbalanced journal persisted")
	}
	if db.Exec("UPDATE journal_lines SET amount=1").Error == nil {
		t.Fatal("posted journal mutated")
	}
	if db.Exec("INSERT INTO journal_lines(id,entity_id,entry_id,account_id,currency,side,amount) SELECT ?,entity_id,id,?,'IDR','debit',1 FROM journal_entries", uuid.NewString(), accountID).Error == nil {
		t.Fatal("appended after posting")
	}
	testCoreHTTP(t, db, entity, user)
	if ok, err := QueueForManualReview(db); err != nil || !ok {
		t.Fatal("worker failed", err)
	}
	status, err := store.Status(conn, id)
	if err != nil || status.State != "needs_review" {
		t.Fatal(status, err)
	}
	if ok, err := QueueForManualReview(db); err != nil || ok {
		t.Fatal("job replayed", err)
	}

	testReviewHTTP(t, db, entity, user, id)
	testPlanningHTTP(t, db, entity, user)
	testN8NProbe(t, db)

}
