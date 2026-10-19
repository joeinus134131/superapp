package finance

import (
	"encoding/json"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

func testReviewHTTP(t *testing.T, db *gorm.DB, entity, user, importID string) {
	db.Exec("UPDATE entity_memberships SET role='owner',revoked_at=NULL WHERE entity_id=? AND user_id=?", entity, user)
	app := fiber.New()
	api := app.Group("/api/v1", func(c *fiber.Ctx) error { c.Locals("user_id", user); return c.Next() })
	RegisterCore(api, db)
	call := func(id, body, key string) (int, map[string]interface{}) {
		req := httptest.NewRequest("POST", "/api/v1/finance/entities/"+entity+"/imports/"+id+"/review", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", key)
		res, err := app.Test(req)
		if err != nil {
			t.Error(err)
			return 0, nil
		}
		defer res.Body.Close()
		var data map[string]interface{}
		json.NewDecoder(res.Body).Decode(&data)
		return res.StatusCode, data
	}
	var existing string
	db.Raw("SELECT id FROM journal_entries WHERE entity_id=? LIMIT 1", entity).Scan(&existing)
	match := `{"expected_revision":1,"action":"match_existing","reason":"Synthetic manual match","existing_journal_id":"` + existing + `"}`
	var before, after int64
	db.Table("journal_entries").Count(&before)
	code, data := call(importID, match, "match")
	if code != 200 || data["review_state"] != "matched_existing" {
		t.Fatal(code, data)
	}
	db.Table("journal_entries").Count(&after)
	if before != after {
		t.Fatal("match duplicated journal")
	}
	code, data = call(importID, match, "match")
	if code != 200 || data["duplicate"] != true {
		t.Fatal(code, data)
	}
	code, _ = call(importID, match, "second-match")
	if code != 409 {
		t.Fatal("double decision accepted", code)
	}
	code, _ = call(importID, strings.Replace(match, "Synthetic manual match", "changed", 1), "match")
	if code != 409 {
		t.Fatal("changed replay accepted", code)
	}
	// A new synthetic source requires manual acceptance and creates exactly one journal.
	e := fixture()
	e.EventID = uuid.NewString()
	e.ProviderMessageID = "review-new"
	body, _ := json.Marshal(e)
	r, err := (PostgresStore{db}).Accept(Connection{connectionID, entity, "gmail"}, e, "review-source", digest(body), body)
	if err != nil {
		t.Fatal(err)
	}
	if ok, err := QueueForManualReview(db); err != nil || !ok {
		t.Fatal(err)
	}
	journal := `{"kind":"standard","effective_date":"2026-10-16","lines":[{"account_id":"` + accountID + `","side":"debit","money":{"amount":"10","currency":"IDR"}},{"account_id":"00000000-0000-4000-8000-000000000004","side":"credit","money":{"amount":"10","currency":"IDR"}}]}`
	accept := `{"expected_revision":1,"action":"accept_new","reason":"Synthetic manual acceptance","journal":` + journal + `}`
	// Failure after posting must roll back the journal and the candidate revision.
	db.Exec("ALTER TABLE review_actions ADD CONSTRAINT fail_review CHECK(false) NOT VALID")
	code, _ = call(r.ImportID, accept, "accept")
	if code != 503 {
		t.Fatal("expected audit failure", code)
	}
	db.Table("journal_entries").Count(&after)
	if after != before {
		t.Fatal("journal escaped failed review")
	}
	db.Exec("ALTER TABLE review_actions DROP CONSTRAINT fail_review")
	var wg sync.WaitGroup
	codes := make(chan int, 4)
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); code, _ := call(r.ImportID, accept, "accept"); codes <- code }()
	}
	wg.Wait()
	close(codes)
	for code := range codes {
		if code != 200 {
			t.Fatal("concurrent review failed", code)
		}
	}
	db.Table("journal_entries").Count(&after)
	if after != before+1 {
		t.Fatal("accept did not produce exactly one journal")
	}
	var n int64
	db.Table("review_actions").Count(&n)
	if n != 2 {
		t.Fatal("audit count", n)
	}
}
