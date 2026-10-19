# Finance research BFF v1

Wave 2 in progress. Upstream contract read from FinRL `deploy/research/openapi.json` and `docs/FINLAB_RESEARCH_API_STATUS.md`; central contract version "1". No real user/market data sent during implementation tests.

## Routes (Go, authenticated user JWT)

- POST `/api/v1/finance/entities/:entity/research/jobs`: unchanged FinLab ResearchRequest payload; UUID `Idempotency-Key`, JSON, max 1 MiB. Owner/editor membership required.
- GET `/api/v1/finance/entities/:entity/research/jobs/:id`: status poll, active membership required.
- GET `/api/v1/finance/entities/:entity/research/jobs/:id/report`: report, active membership required. 409 when unavailable.

Job identity is owned upstream by **authenticated user sub + path entity**. Sharing membership does not grant access to another user's FinLab jobs. No body owner/user_id/entity_id accepted. No broker, order, payment, mailbox or notifications. These are user-authenticated routes; n8n ingestion credentials cannot read them. No guessed list/read endpoints: v1 has only submit/status/report, with returned job_id used for reads.

## Config and runtime

- `FINLAB_BASE_URL`: fixed private service origin (no body-provided URL, query, userinfo or path prefix). Blank leaves routes available but returns 503 research_not_configured after membership check.
- `FINLAB_DELEGATION_SECRET`: protected shared service secret >=32 bytes, separate from user JWT and ingestion tokens. Never returned/logged. JWT HS256, iss superapp, aud finlab, 3-minute TTL, sub/entity/scope/jti generated per call.
- HTTPS verifies normally. Plain HTTP requires explicit `FINLAB_ALLOW_INSECURE_HTTP=true` only on confirmed private staging network. Redirects refused; never disable TLS verification.
- `SKIP_AUTO_MIGRATION=true`: runtime skips existing AutoMigrate **and extension creation**. Explicit migration role must provision users/core schema and apply all required SQL (000001 storage, 000002 finance, 000003 storage manifest, 000004 review, 000005 extraction). No research BFF migration is needed; FinLab owns durable research job/report storage. This switch is not a migration runner and does not repair missing schema.

Go timeout 20 seconds; response max 16 MiB; auth/cookie/redirect headers not forwarded. Browser receives no-store responses. Domain 404/409/422/413/415/429/503 status/code propagated through safe error envelope; upstream auth refusal maps to 502 research_delegation_rejected, network errors to 502, timeout to 504. Retry submit with same key/body after unknown transport outcome. Upstream remains authoritative for request schema/market validation and durable idempotency.

## Actual integration verification

Opt-in Go test `TestResearchPythonIntegration` starts the actual Python ResearchServer and actual worker run_once from the FinLab checkout, plus isolated Go/Python schemas in a dedicated temporary PostgreSQL. It uses real user JWT verification (different user/service secrets), membership checks, delegation validation and real synthetic scoring. Its minimal package initializer mirrors the FinLab Dockerfile's training/broker-free initializer; API/scoring/database implementations are not mocked.

Required test env: `FINANCE_TEST_DATABASE_URL` (Go PG DSN), `FINLAB_TEST_RESEARCH_DATABASE_URL` (SQLAlchemy PostgreSQL URL), `FINLAB_TEST_PYTHON`, `FINLAB_TEST_REPO`. No production DATABASE_URL fallback. Run `GOCACHE=/tmp/superapp-go-cache go test ./internal/finance -run TestResearchPythonIntegration -v -count=1` in backend. Test schema/listener/process cleanup is automatic. **Passed 2026-10-16** against disposable PostgreSQL 14: real Go user-JWT middleware → membership → delegated JWT → actual Python API/worker/scoring/report. Same-key replay, different-body 409, nested-validation 422, report-before-ready 409, cross-user and cross-entity status/report 404, viewer-submit 403, revoked-membership 403, no token leakage, include_laya=false completed report with synthetic source and rl_executed=false, include_laya=true/no evidence durable honest failure, unavailable service 502. No API/scoring/storage mocks; no live market/Laya request.
