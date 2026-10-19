# Finance ingestion staging contract v1

Implementation: POST `/api/v1/finance/import-events`, GET `/api/v1/finance/imports/:id`. Connection token only on both routes. Mount precedes the regular user JWT group. Code is ready for local/staging use, not deployed. Migration `backend/migrations/000002_finance.up.sql` must be explicitly applied after users exists. Backend refuses finance operations with 503 when schema is missing. Existing AutoMigrate does not apply finance schema.

## Provisioning (operator, staging only)

No shared integration token environment variable exists. Provision each connection separately in PostgreSQL with confirmed entity owner and a cryptographically random token of at least 32 bytes. Store only lowercase SHA-256 of the opaque token in `integration_connections.token_sha256`; keep plaintext solely in the n8n credential store. Set connection state `active` only after its entity/provider mapping is reviewed. Initial default is `disabled`. Never use JWT_SECRET, a user access token, or FinLab delegation secret as this token. Revocation sets state `revoked`; status polling then also stops. Rotation updates the hash atomically. Do not put token in a URL or SQL/log history.

Provision `finance_entities` and `entity_memberships` for the confirmed user first. Insert connection `(id,entity_id,provider,token_sha256,state)`. `connection_id` in request must equal that row's ID and provider must match. Body accepts no user_id/entity_id. Status reads are connection+entity scoped. Owner/user membership status polling is planned; use connection credential for v1 transport tests.

## Test from n8n staging

Set the transport base URL to the actual reachable Go API. Set its bearer credential to the connection token, and body connection_id to the provisioned ID. Use the central synthetic fixture copied to `shared/finance/import-event-v1.synthetic.json`, an Idempotency-Key (max 128 chars), JSON Content-Type and X-Request-ID UUID. Response is 202 with received state only after durable event/job/outbox commit. Same envelope+key returns same ID and duplicate true; changed envelope returns 409. GET the returned import_id using the same credential. A revoked/other connection cannot read it.

Only exact UTF-8 text with verified SHA-256 is supported initially. storage_ref is rejected until private vault upload registry is configured. Limit 1 MiB. No arbitrary URL fetch. JSON whitespace/key order does not change replay fingerprint; document text bytes do. Different event/source body is a conflict, never silently merged. Import state received does not mean journal posted. Worker/parser and Inbox review follow separately; no live bank format is supported yet.

Error envelope contains code/message/request_id. Database payload writes use silent SQL logger to avoid printing document text. No new notification dispatcher exists; outbox rows are durable internal events only.

## Verification

`cd backend && GOCACHE=/tmp/superapp-go-cache go test ./...`

For actual SQL tests, set dedicated disposable `FINANCE_TEST_DATABASE_URL` (never production DATABASE_URL). Tests create/drop a unique schema and use synthetic users/entities. They check concurrent replay, connection/entity status isolation, body conflicts, outbox rollback, exact money balance and immutable posted journals. Temporary test PostgreSQL is not evidence of production deployment.

## Disposable Go–Node HTTPS proof

Set `FINANCE_N8N_PROBE_PATH` to the existing n8n `tests/staging-probe.mjs` and run `go test ./internal/finance -v` with dedicated `FINANCE_TEST_DATABASE_URL`. The test creates a unique PostgreSQL schema, provisions only a synthetic connection token, starts the actual Go integration routes on an ephemeral TLS loopback listener, trusts its temporary CA via NODE_EXTRA_CA_CERTS, invokes the unmodified Node probe, and removes its schema/listener afterwards. No TLS verification bypass or production HTTPS relaxation. Probe output on 2026-10-16: `{"synthetic":true,"replay_verified":true,"state":"received"}`.

Manual-review queue worker: `DATABASE_URL=<staging DB> go run ./cmd/finance-review-worker` (one shot, maximum 1000 jobs). It marks durable jobs completed and evidence needs_review atomically. It does not extract transactions or post journals. No notification dispatch. A later parser/reviewer must not treat this completed routing job as a completed accounting import.

Update: the worker now runs the synthetic-only draft parser and stores immutable extraction evidence and unresolved candidates (migrations 000004/000005). It cannot post money. Manual review API and atomic posting are documented in `FINANCE_REVIEW.md`.
