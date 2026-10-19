package finance

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"math/big"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

func testN8NProbe(t *testing.T, db *gorm.DB) {
	path := os.Getenv("FINANCE_N8N_PROBE_PATH")
	if path == "" {
		t.Log("external n8n probe not requested")
		return
	}
	// All rows live in the disposable test schema, never the application's DB.
	for _, q := range []string{"TRUNCATE durable_jobs, integration_events, transaction_candidates, review_actions CASCADE", "DELETE FROM outbox_events"} {
		if err := db.Exec(q).Error; err != nil {
			t.Fatal(err)
		}
	}
	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	token := digest(tokenBytes)
	if err := db.Exec("UPDATE integration_connections SET token_sha256=? WHERE id=?", digest([]byte(token)), connectionID).Error; err != nil {
		t.Fatal(err)
	}
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	cert := &x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "Synthetic finance local test"}, NotBefore: time.Now().Add(-time.Minute), NotAfter: time.Now().Add(time.Hour), IPAddresses: []net.IP{net.ParseIP("127.0.0.1")}, KeyUsage: x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, IsCA: true, BasicConstraintsValid: true}
	der, err := x509.CreateCertificate(rand.Reader, cert, cert, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	keyDER, _ := x509.MarshalPKCS8PrivateKey(key)
	ca := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: keyDER})
	pair, err := tls.X509KeyPair(ca, keyPEM)
	if err != nil {
		t.Fatal(err)
	}
	caPath := filepath.Join(t.TempDir(), "local-ca.pem")
	if err = os.WriteFile(caPath, ca, 0600); err != nil {
		t.Fatal(err)
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	app := fiber.New(fiber.Config{DisableStartupMessage: true})
	RegisterIntegration(app, PostgresStore{DB: db})
	go app.Listener(tls.NewListener(listener, &tls.Config{Certificates: []tls.Certificate{pair}, MinVersion: tls.VersionTLS12}))
	defer app.Shutdown()
	cmd := exec.Command("node", path)
	cmd.Env = append(os.Environ(), "FINANCE_SYNTHETIC_STAGING_APPROVED=yes", "FINANCE_STAGING_URL=https://"+listener.Addr().String(), "FINANCE_INTEGRATION_TOKEN="+token, "NODE_EXTRA_CA_CERTS="+caPath)
	result, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("n8n probe failed: %v %s", err, result)
	}
	t.Log(string(result))
}
