package finance

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/middleware"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Opt in only: actual Python API+worker, isolated PostgreSQL schemas and data.
func TestResearchPythonIntegration(t *testing.T) {
	dsn, python, repo := os.Getenv("FINANCE_TEST_DATABASE_URL"), os.Getenv("FINLAB_TEST_PYTHON"), os.Getenv("FINLAB_TEST_REPO")
	if dsn == "" || python == "" || repo == "" || os.Getenv("FINLAB_TEST_RESEARCH_DATABASE_URL") == "" {
		t.Skip("dedicated PostgreSQL and FinLab Python runtime required")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()
	sqlDB.SetMaxOpenConns(1)
	goSchema, pySchema := "bff_go_"+uuid.NewString()[:8], "bff_py_"+uuid.NewString()[:8]
	for _, schema := range []string{goSchema, pySchema} {
		if err = db.Exec("CREATE SCHEMA " + schema).Error; err != nil {
			t.Fatal(err)
		}
		defer db.Exec("DROP SCHEMA " + schema + " CASCADE")
	}
	db.Exec("SET search_path TO " + goSchema)
	db.Exec("CREATE TABLE users(id uuid PRIMARY KEY)")
	ddl, err := os.ReadFile("../../migrations/000002_finance.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	if err = db.Exec(string(ddl)).Error; err != nil {
		t.Fatal(err)
	}
	u1, u2, e1, e2 := uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString()
	for _, u := range []string{u1, u2} {
		if err = db.Exec("INSERT INTO users(id) VALUES(?)", u).Error; err != nil {
			t.Fatal(err)
		}
	}
	for _, e := range []string{e1, e2} {
		if err = db.Exec("INSERT INTO finance_entities(id,owner_user_id,kind,display_name,base_currency) VALUES(?,?,'personal','Synthetic BFF','IDR')", e, u1).Error; err != nil {
			t.Fatal(err)
		}
	}
	for _, pair := range [][2]string{{e1, u1}, {e2, u1}, {e1, u2}} {
		if err = db.Exec("INSERT INTO entity_memberships(entity_id,user_id,role) VALUES(?,?,'owner')", pair[0], pair[1]).Error; err != nil {
			t.Fatal(err)
		}
	}
	secret := digest([]byte(uuid.NewString() + uuid.NewString()))
	script, _ := filepath.Abs("testdata/research_service.py")
	cmd := exec.Command(python, "-u", script)
	cmd.Dir = t.TempDir()
	cmd.Env = append(os.Environ(), "PYTHONDONTWRITEBYTECODE=1", "FINLAB_TEST_SCHEMA="+pySchema, "FINLAB_DELEGATION_SECRET="+secret, "LAYA_ENABLED=false")
	input, _ := cmd.StdinPipe()
	output, _ := cmd.StdoutPipe()
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err = cmd.Start(); err != nil {
		t.Fatal(err)
	}
	stopped := false
	defer func() {
		if !stopped {
			cmd.Process.Kill()
			cmd.Wait()
		}
	}()
	lines := make(chan string, 8)
	go func() {
		scanner := bufio.NewScanner(output)
		for scanner.Scan() {
			lines <- scanner.Text()
		}
		close(lines)
	}()
	next := func() string {
		t.Helper()
		select {
		case line, ok := <-lines:
			if !ok {
				t.Fatalf("Python exited: %s", stderr.String())
			}
			return line
		case <-time.After(40 * time.Second):
			t.Fatal("Python research test timed out")
			return ""
		}
	}
	var ready struct {
		URL string `json:"url"`
	}
	if err = json.Unmarshal([]byte(next()), &ready); err != nil || ready.URL == "" {
		t.Fatal("invalid Python readiness", err)
	}
	app := fiber.New()
	userSecret := "synthetic-user-auth-secret-different-from-service-secret"
	api := app.Group("/api/v1", middleware.JWTMiddleware(userSecret, "", "synthetic-superapp-auth", "authenticated"))
	if err = RegisterResearch(api, db, ResearchConfig{ready.URL, []byte(secret), true}); err != nil {
		t.Fatal(err)
	}
	call := func(user, entity, method, suffix string, body []byte, key string) (int, map[string]interface{}, string) {
		token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": user, "iss": "synthetic-superapp-auth", "aud": "authenticated", "exp": time.Now().Add(time.Minute).Unix()}).SignedString([]byte(userSecret))
		req := httptest.NewRequest(method, "/api/v1/finance/entities/"+entity+"/research/jobs"+suffix, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Idempotency-Key", key)
		res, err := app.Test(req, 30000)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		raw, _ := io.ReadAll(res.Body)
		var data map[string]interface{}
		json.Unmarshal(raw, &data)
		if strings.Contains(string(raw), secret) || strings.Contains(string(raw), token) || res.Header.Get("Authorization") != "" {
			t.Fatal("credential leaked")
		}
		if res.Header.Get("Cache-Control") != "no-store" {
			t.Fatal("missing private response cache guard")
		}
		return res.StatusCode, data, string(raw)
	}
	body, err := os.ReadFile(filepath.Join(repo, "deploy/research/examples/synthetic-request.json"))
	if err != nil {
		t.Fatal(err)
	}
	key := uuid.NewString()
	code, ack, raw := call(u1, e1, "POST", "", body, key)
	if code != 202 {
		t.Fatal(code, raw)
	}
	id := ack["job_id"].(string)
	code, replay, raw := call(u1, e1, "POST", "", body, key)
	if code != 202 || replay["job_id"] != id {
		t.Fatal("replay failed", code, raw)
	}
	code, _, _ = call(u1, e1, "GET", "/"+id+"/report", nil, "")
	if code != 409 {
		t.Fatal("premature report", code)
	}
	changed := bytes.Replace(body, []byte(`"horizon_months": 12`), []byte(`"horizon_months": 24`), 1)
	code, data, raw := call(u1, e1, "POST", "", changed, key)
	if code != 409 || data["error"].(map[string]interface{})["code"] != "idempotency_conflict" {
		t.Fatal("conflict propagation", code, raw)
	}
	invalid := bytes.Replace(body, []byte(`"include_laya": false`), []byte(`"include_laya": "false"`), 1)
	code, data, raw = call(u1, e1, "POST", "", invalid, uuid.NewString())
	if code != 422 || data["error"].(map[string]interface{})["code"] != "invalid_request" {
		t.Fatal("validation propagation", code, raw)
	}
	for _, field := range []string{"owner", "user_id", "entity_id"} {
		injected := append([]byte(fmt.Sprintf(`{"%s":"%s",`, field, u2)), bytes.TrimSpace(body)[1:]...)
		code, _, _ = call(u1, e1, "POST", "", injected, uuid.NewString())
		if code != 422 {
			t.Fatal("body identity accepted", field, code)
		}
	}
	for _, p := range [][2]string{{u2, e1}, {u1, e2}} {
		code, _, _ = call(p[0], p[1], "GET", "/"+id, nil, "")
		if code != 404 {
			t.Fatal("cross-tenant status", code)
		}
	}
	fmt.Fprintln(input, "run")
	if !strings.Contains(next(), `"processed": true`) {
		t.Fatal("worker did not process")
	}
	code, status, raw := call(u1, e1, "GET", "/"+id, nil, "")
	if code != 200 || status["state"] != "completed" || status["report_available"] != true {
		t.Fatal(code, raw)
	}
	code, report, raw := call(u1, e1, "GET", "/"+id+"/report", nil, "")
	if code != 200 || report["rl_executed"] != false || report["laya"].(map[string]interface{})["state"] != "not_requested" || len(report["screening"].([]interface{})) == 0 || report["sources"].([]interface{})[0].(map[string]interface{})["synthetic"] != true {
		t.Fatal("actual scoring report invalid", code, raw)
	}
	for _, p := range [][2]string{{u2, e1}, {u1, e2}} {
		code, _, _ = call(p[0], p[1], "GET", "/"+id+"/report", nil, "")
		if code != 404 {
			t.Fatal("cross-tenant report", code)
		}
	}
	// Failure is a durable job result, never a fabricated successful report.
	laya := bytes.Replace(body, []byte(`"include_laya": false`), []byte(`"include_laya": true`), 1)
	code, ack, raw = call(u1, e1, "POST", "", laya, uuid.NewString())
	if code != 202 {
		t.Fatal(code, raw)
	}
	failedID := ack["job_id"].(string)
	fmt.Fprintln(input, "run")
	next()
	code, status, raw = call(u1, e1, "GET", "/"+failedID, nil, "")
	if code != 200 || status["state"] != "failed" || status["failure_code"] != "laya_evidence_required" {
		t.Fatal("failure status hidden", code, raw)
	}
	db.Exec("UPDATE entity_memberships SET role='viewer' WHERE entity_id=? AND user_id=?", e1, u2)
	code, _, _ = call(u2, e1, "POST", "", body, uuid.NewString())
	if code != 403 {
		t.Fatal("viewer submitted", code)
	}
	db.Exec("UPDATE entity_memberships SET revoked_at=now() WHERE entity_id=? AND user_id=?", e1, u1)
	code, _, _ = call(u1, e1, "GET", "/"+id, nil, "")
	if code != 403 {
		t.Fatal("revoked membership read", code)
	}
	fmt.Fprintln(input, "stop")
	input.Close()
	if err = cmd.Wait(); err != nil {
		t.Fatal("Python exit", err)
	}
	stopped = true
	code, _, _ = call(u1, e2, "GET", "/"+id, nil, "")
	if code != 502 {
		t.Fatal("unavailable service hidden", code)
	}
	t.Log("actual Go JWT-authenticated BFF -> Python API/worker -> disposable PostgreSQL: replay, scoring, report, user/entity isolation and error propagation passed; synthetic only")
}
