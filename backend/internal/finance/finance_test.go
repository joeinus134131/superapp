package finance

import (
	"encoding/json"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

const connectionID = "00000000-0000-4000-8000-000000000002"
const accountID = "00000000-0000-4000-8000-000000000003"

func fixture() ImportEvent {
	text := "SYNTHETIC FIXTURE ONLY"
	return ImportEvent{SchemaVersion: "1", EventID: "00000000-0000-4000-8000-000000000001", EventType: "finance.document.received", ConnectionID: connectionID, Provider: "gmail", ProviderMessageID: "synthetic-1", ReceivedAt: time.Date(2026, 10, 16, 1, 0, 0, 0, time.UTC), Document: Document{Kind: "bank_notification", Text: &text, ContentSHA256: digest([]byte(text)), Metadata: map[string]interface{}{"synthetic": true}}}
}
func TestDocumentValidation(t *testing.T) {
	e := fixture()
	if err := e.Validate(); err != nil {
		t.Fatal(err)
	}
	e.Document.ContentSHA256 = strings.Repeat("0", 64)
	if e.Validate() == nil {
		t.Fatal("hash mismatch accepted")
	}
	e = fixture()
	ref := "https://attacker.invalid"
	e.Document.StorageRef = &ref
	if e.Validate() == nil {
		t.Fatal("arbitrary URL accepted")
	}
}
func TestExactBalancedJournal(t *testing.T) {
	lines := []Line{{accountID, "debit", Money{"0.1", "IDR"}}, {accountID, "debit", Money{"0.2", "IDR"}}, {accountID, "credit", Money{"0.3", "IDR"}}}
	if err := ValidateJournal(lines); err != nil {
		t.Fatal(err)
	}
	if err := ValidateJournal(Reverse(lines)); err != nil {
		t.Fatal(err)
	}
	lines[2].Money.Amount = "0.30000001"
	if ValidateJournal(lines) == nil {
		t.Fatal("imbalance accepted")
	}
	lines[2].Money = Money{"0.3", "USD"}
	if ValidateJournal(lines) == nil {
		t.Fatal("currencies netted")
	}
	for _, a := range []string{"1e3", "-1", "01", "NaN", "0.123456789"} {
		if (Money{a, "IDR"}).Validate() == nil {
			t.Fatalf("accepted %s", a)
		}
	}
}

type fakeStore struct {
	hash  string
	body  string
	calls int
}

func (s *fakeStore) Connection(h string) (Connection, error) {
	if h != digest([]byte(strings.Repeat("t", 32))) {
		return Connection{}, ErrUnauthorized
	}
	return Connection{ID: connectionID, EntityID: accountID, Provider: "gmail"}, nil
}
func (s *fakeStore) Accept(c Connection, e ImportEvent, k, h string, b []byte) (ImportResult, error) {
	s.calls++
	if s.hash != "" && s.hash != h {
		return ImportResult{}, ErrConflict
	}
	duplicate := s.hash != ""
	s.hash = h
	s.body = string(b)
	return ImportResult{"1", e.EventID, "received", duplicate}, nil
}
func (s *fakeStore) Status(c Connection, id string) (ImportResult, error) {
	return ImportResult{}, gorm.ErrRecordNotFound
}
func TestImportHTTP(t *testing.T) {
	s := &fakeStore{}
	app := fiber.New()
	RegisterIntegration(app, s)
	send := func(body, token string) int {
		req := httptest.NewRequest("POST", "/api/v1/finance/import-events", strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", "fixture-key")
		res, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		return res.StatusCode
	}
	b, _ := json.Marshal(fixture())
	token := strings.Repeat("t", 32)
	if got := send(string(b), token); got != 202 {
		t.Fatal(got)
	}
	if got := send(string(b), token); got != 202 {
		t.Fatal(got)
	}
	e := fixture()
	e.ProviderMessageID = "changed"
	changed, _ := json.Marshal(e)
	if got := send(string(changed), token); got != 409 {
		t.Fatal(got)
	}
	e = fixture()
	e.ConnectionID = accountID
	changed, _ = json.Marshal(e)
	if got := send(string(changed), token); got != 403 {
		t.Fatal(got)
	}
	if got := send(string(b), strings.Repeat("x", 32)); got != 401 {
		t.Fatal(got)
	}
	if got := send(strings.TrimSuffix(string(b), "}")+`,"user_id":"arbitrary"}`, token); got != 400 {
		t.Fatal(got)
	}
	if got := send(strings.Repeat("x", MaxPayload+1), token); got != 413 {
		t.Fatal(got)
	}
	if s.calls != 3 {
		t.Fatal("rejected events reached persistence")
	}
}
