package middleware

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type jwk struct {
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	Alg string `json:"alg"`
	X   string `json:"x"`
	Y   string `json:"y"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type jwksDocument struct {
	Keys []jwk `json:"keys"`
}

// JWKSResolver fetches and caches public keys from a Supabase (or any) JWKS
// endpoint so asymmetric access tokens (ES256/RS256) can be verified without a
// shared secret.
type JWKSResolver struct {
	url       string
	ttl       time.Duration
	client    *http.Client
	mu        sync.RWMutex
	keys      map[string]crypto.PublicKey
	fetchedAt time.Time
}

func NewJWKSResolver(url string) *JWKSResolver {
	return &JWKSResolver{
		url:    url,
		ttl:    15 * time.Minute,
		client: &http.Client{Timeout: 5 * time.Second},
		keys:   map[string]crypto.PublicKey{},
	}
}

// Keyfunc resolves the signing key for a token, refreshing the cache when it is
// stale or when the token carries an unknown key id.
func (r *JWKSResolver) Keyfunc(token *jwt.Token) (interface{}, error) {
	kid, _ := token.Header["kid"].(string)

	key, ok, stale := r.lookup(kid)
	if (!ok || stale) && r.url != "" {
		if err := r.refresh(); err != nil {
			if !ok {
				return nil, err
			}
		} else {
			key, ok, _ = r.lookup(kid)
		}
	}
	if !ok || key == nil {
		return nil, fmt.Errorf("no JWKS key matches kid %q", kid)
	}
	return key, nil
}

func (r *JWKSResolver) lookup(kid string) (crypto.PublicKey, bool, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	key, ok := r.keys[kid]
	stale := r.fetchedAt.IsZero() || time.Since(r.fetchedAt) > r.ttl
	return key, ok, stale
}

func (r *JWKSResolver) refresh() error {
	response, err := r.client.Get(r.url)
	if err != nil {
		return fmt.Errorf("could not fetch JWKS: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned HTTP %d", response.StatusCode)
	}

	var document jwksDocument
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&document); err != nil {
		return fmt.Errorf("could not decode JWKS: %w", err)
	}

	keys := make(map[string]crypto.PublicKey, len(document.Keys))
	for _, entry := range document.Keys {
		publicKey, err := entry.publicKey()
		if err != nil {
			continue
		}
		keys[entry.Kid] = publicKey
	}
	if len(keys) == 0 {
		return fmt.Errorf("JWKS endpoint returned no usable keys")
	}

	r.mu.Lock()
	r.keys = keys
	r.fetchedAt = time.Now()
	r.mu.Unlock()
	return nil
}

func (k jwk) publicKey() (crypto.PublicKey, error) {
	switch k.Kty {
	case "EC":
		var curve elliptic.Curve
		switch k.Crv {
		case "P-256":
			curve = elliptic.P256()
		case "P-384":
			curve = elliptic.P384()
		case "P-521":
			curve = elliptic.P521()
		default:
			return nil, fmt.Errorf("unsupported EC curve %q", k.Crv)
		}
		x, err := base64.RawURLEncoding.DecodeString(k.X)
		if err != nil {
			return nil, err
		}
		y, err := base64.RawURLEncoding.DecodeString(k.Y)
		if err != nil {
			return nil, err
		}
		return &ecdsa.PublicKey{Curve: curve, X: new(big.Int).SetBytes(x), Y: new(big.Int).SetBytes(y)}, nil
	case "RSA":
		n, err := base64.RawURLEncoding.DecodeString(k.N)
		if err != nil {
			return nil, err
		}
		e, err := base64.RawURLEncoding.DecodeString(k.E)
		if err != nil {
			return nil, err
		}
		exponent := new(big.Int).SetBytes(e)
		if !exponent.IsInt64() {
			return nil, fmt.Errorf("invalid RSA exponent")
		}
		return &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(exponent.Int64())}, nil
	default:
		return nil, fmt.Errorf("unsupported key type %q", k.Kty)
	}
}
