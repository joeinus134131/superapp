package finance

import (
	"encoding/json"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func testPlanningHTTP(t *testing.T, db *gorm.DB, entity, user string) {
	app := fiber.New()
	api := app.Group("/api/v1", func(c *fiber.Ctx) error { c.Locals("user_id", user); return c.Next() })
	RegisterCore(api, db)
	call := func(path, body, key string) (int, map[string]interface{}) {
		req := httptest.NewRequest("POST", "/api/v1/finance/entities/"+entity+path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", key)
		r, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		defer r.Body.Close()
		var data map[string]interface{}
		json.NewDecoder(r.Body).Decode(&data)
		return r.StatusCode, data
	}
	bank, equity, g1, g2 := uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString()
	today := time.Now().UTC().Format("2006-01-02")
	for _, a := range []struct{ id, kind string }{{bank, "bank"}, {equity, "equity"}} {
		code, data := call("/accounts", `{"id":"`+a.id+`","kind":"`+a.kind+`","display_name":"Synthetic planning","currency":"IDR"}`, "")
		if code != 201 {
			t.Fatal(code, data)
		}
	}
	opening := `{"kind":"opening","effective_date":"` + today + `","lines":[{"account_id":"` + bank + `","side":"debit","money":{"amount":"100","currency":"IDR"}},{"account_id":"` + equity + `","side":"credit","money":{"amount":"100","currency":"IDR"}}]}`
	if code, data := call("/journals", opening, "planning-opening"); code != 201 {
		t.Fatal(code, data)
	}
	for _, goal := range []string{g1, g2} {
		if code, data := call("/goals", `{"id":"`+goal+`","display_name":"Synthetic target","target":{"amount":"100","currency":"IDR"},"due_date":"2027-01-01"}`, ""); code != 201 {
			t.Fatal(code, data)
		}
	}
	allocation := `{"account_id":"` + bank + `","money":{"amount":"60","currency":"IDR"},"expected_revision":0}`
	if code, data := call("/goals/"+g1+"/allocations", allocation, "reserve-one"); code != 200 {
		t.Fatal(code, data)
	}
	if code, data := call("/goals/"+g1+"/allocations", allocation, "reserve-one"); code != 200 || data["revision"] != float64(1) {
		t.Fatal("allocation replay", code, data)
	}
	if code, _ := call("/goals/"+g2+"/allocations", allocation, "reserve-two"); code != 409 {
		t.Fatal("same cash allocated twice", code)
	}
	tomorrow := time.Now().UTC().AddDate(0, 0, 1).Format("2006-01-02")
	through := time.Now().UTC().AddDate(0, 0, 3).Format("2006-01-02")
	forecast := `{"as_of":"` + today + `","through":"` + through + `","currency":"IDR","cash_floor":{"amount":"10","currency":"IDR"},"flows":[{"date":"` + tomorrow + `","kind":"outflow","money":{"amount":"20","currency":"IDR"},"source_ref":"synthetic assumption"}]}`
	code, data := call("/forecast", forecast, "forecast-one")
	if code != 200 || data["forecast"].(map[string]interface{})["one_time_capacity"] != "10" {
		t.Fatal("forecast reserve/floor doublecount", code, data)
	}
	runID := data["run_id"]
	if code, data = call("/forecast", forecast, "forecast-one"); code != 200 || data["run_id"] != runID {
		t.Fatal("forecast snapshot replay", code, data)
	}
	if code, _ := call("/goals/"+g1+"/allocations", allocation, "stale"); code != 409 {
		t.Fatal("stale revision accepted", code)
	}
	var n int64
	db.Table("journal_entries").Count(&n)
	release := strings.Replace(strings.Replace(allocation, `"60"`, `"20"`, 1), `"expected_revision":0`, `"expected_revision":1`, 1)
	if code, data := call("/goals/"+g1+"/allocations", release, "release"); code != 200 {
		t.Fatal(code, data)
	}
	var after int64
	db.Table("journal_entries").Count(&after)
	if after != n {
		t.Fatal("earmark changed journal assets")
	}
}
