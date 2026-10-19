package finance

import (
	"encoding/json"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"net/http/httptest"
	"strings"
	"testing"
)

func testCoreHTTP(t *testing.T, db *gorm.DB, entity, user string) {
	db.Exec("INSERT INTO entity_memberships(entity_id,user_id,role) VALUES(?,?,'owner')", entity, user)
	app := fiber.New()
	api := app.Group("/api/v1", func(c *fiber.Ctx) error { c.Locals("user_id", user); return c.Next() })
	RegisterCore(api, db)
	call := func(method, path, body, key string) (int, map[string]interface{}) {
		req := httptest.NewRequest(method, "/api/v1/finance/entities/"+entity+path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", key)
		res, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		var data map[string]interface{}
		json.NewDecoder(res.Body).Decode(&data)
		return res.StatusCode, data
	}
	bank, equity := uuid.NewString(), uuid.NewString()
	for _, a := range []struct{ id, kind string }{{bank, "bank"}, {equity, "equity"}} {
		code, data := call("POST", "/accounts", `{"id":"`+a.id+`","kind":"`+a.kind+`","display_name":"Synthetic","currency":"IDR"}`, "")
		if code != 201 {
			t.Fatal(code, data)
		}
	}
	journal := `{"kind":"opening","effective_date":"2026-10-16","lines":[{"account_id":"` + bank + `","side":"debit","money":{"amount":"100","currency":"IDR"}},{"account_id":"` + equity + `","side":"credit","money":{"amount":"100","currency":"IDR"}}]}`
	code, data := call("POST", "/journals", journal, "http-opening")
	if code != 201 {
		t.Fatal(code, data)
	}
	entry := data["journal_id"].(string)
	code, data = call("POST", "/journals", journal, "http-opening")
	if code != 201 || data["duplicate"] != true {
		t.Fatal(code, data)
	}
	reversal := `{"kind":"reversal","effective_date":"2026-10-17","reversal_of":"` + entry + `"}`
	code, data = call("POST", "/journals", reversal, "http-reverse")
	if code != 201 {
		t.Fatal(code, data)
	}
	code, _ = call("POST", "/journals", reversal, "http-second-reverse")
	if code != 409 {
		t.Fatal(code)
	}
	code, data = call("GET", "/balances", "", "")
	if code != 200 {
		t.Fatal(code, data)
	}
	for _, b := range data["balances"].([]interface{}) {
		if b.(map[string]interface{})["debit_less_credit"] != "0" {
			t.Fatal("reversal did not neutralize balance", b)
		}
	}
	db.Exec("UPDATE entity_memberships SET role='viewer' WHERE entity_id=? AND user_id=?", entity, user)
	code, _ = call("POST", "/journals", journal, "viewer-write")
	if code != 403 {
		t.Fatal("viewer posted", code)
	}
	db.Exec("UPDATE entity_memberships SET revoked_at=now() WHERE entity_id=? AND user_id=?", entity, user)
	code, _ = call("GET", "/imports", "", "")
	if code != 403 {
		t.Fatal("revoked member read", code)
	}
}
