# Financial repository implementation status

Updated 2026-10-16 (Asia/Jakarta). Checkpoint: REP/CORE foundation, durable ingestion and manual review implemented in source/staging. Full blueprint remains in progress. Branch `codex/web-postgres-migration`; base HEAD `ad3d3d1f`; no new commit. Existing PostgreSQL/JWKS/provisioning/cache/UI changes preserved. No production migration, real mailbox/credential activation, money movement or notification dispatch.

## Ready in source / disposable staging

| Endpoint / component | Actual behavior |
|---|---|
| POST `/api/v1/finance/import-events` | Separate opaque connection token mapped by SHA-256 in PostgreSQL to entity/provider. No arbitrary user_id. Atomic event/job/outbox acceptance; exact UTF-8 hash, 1 MiB limit, canonical-envelope replay/conflict checks. |
| GET `/api/v1/finance/imports/:id` | Connection+entity-scoped status; same credential type as ingestion. Revoked/other connection denied. |
| GET/POST `/api/v1/finance/entities` | Existing authenticated UUID user; create membership atomically; explicit entity UUID makes create retryable. |
| GET/POST `/api/v1/finance/entities/:entity/accounts` | Active membership, owner/editor writes, viewer reads; explicit account UUID and conflict checks. |
| GET/POST `.../journals`, GET `.../balances` | Exact decimal balance per currency; opening equity, transfer/fee account-kind guards; immutable posted entries/lines; server-derived reversal; journal Idempotency-Key. Balance is debit-minus-credit, configured accounts only. |
| GET `.../imports` | Membership-scoped source preview + candidate revision/review_state, max 50 records, text preview max 4000 characters. |
| POST `.../imports/:id/review` | Unresolved/reject/match_existing/accept_new; revision locking, key/body replay fingerprint; immutable audit; journal/evidence/candidate/outbox in one transaction. Match does not create another journal. |
| One-shot `cmd/finance-review-worker` | SKIP LOCKED durable queue; immutable draft extraction + unresolved candidate + outbox. Synthetic-only parser; no real bank parser or posting capability. |
| Web `/finance/repository` | Entity selection, ledger debit-minus-credit and source Inbox; explicit accept-new form with user-selected date/debit/credit/decimal amount/reason, match/reject/unresolved. Waits for server confirmation; no optimistic posted money. |
| Shared contracts/cache | JSON Schema + central synthetic fixture, TS money/import/cache types, conflicting/unconfirmed cache guard, provenance-preserving legacy staging helper. Not automatic canonical cutover. |
| FinLab delegation signer | Backend-only membership-checked HS256, superapp/finlab issuer/aud, 3-minute TTL, sub/entity/scope/jti. Authenticated product BFF implemented and actual Python integration verified (Wave 2 below); tokens never exposed to browser. |
| Existing storage migration guard | Per-user serialization; equal/stale differing revision -> 409; persisted request manifest rejects changed replay. Local cache retained. Historical migration without manifest requires new explicit preview/key. |

CORS includes Idempotency-Key/X-Request-ID for browser review. SQL writes containing source text use silent logger. Private vault storage_ref fails closed until implemented. No integration token env variable is shared globally: connection hashes are provisioned per confirmed entity/provider, default disabled. Test harness provisions only random synthetic tokens in isolated schemas.

## Verification

- **Passed full Go regression with real disposable PostgreSQL 14**: DDL, 8-way ingestion replay, outbox-failure rollback, tenant status isolation, exact per-currency journal balance and immutability, account/journal HTTP, opening/reversal, viewer/revoked membership, queue/extraction, matching without duplicate journal, four-way acceptance replay, audit-failure journal/candidate rollback, storage revision/fingerprint conflicts.
- **Passed Go ↔ Node HTTPS probe**: unmodified n8n `tests/staging-probe.mjs` invoked against actual Go routes on ephemeral TLS loopback + isolated PostgreSQL. Temporary CA via NODE_EXTRA_CA_CERTS, verification retained. Output `{"synthetic":true,"replay_verified":true,"state":"received"}`. This test exposed/fixed GET schema_version after GORM Scan. Fake-store unit tests are separate from this evidence.
- **Passed web** targeted ESLint, `tsc --noEmit`, optimized `next build` including `/finance/repository` (after accept-new UI).
- **Passed shared** `tsc --noEmit` and `node --experimental-strip-types --test shared/finance/contracts.test.mts` (2 tests). Native Node ESM test is .mts to keep explicit .ts import outside broad shared tsconfig.
- `git diff --check` on touched tracked backend files passed. Workspace-wide check reports unrelated pre-existing whitespace in mobile more.tsx and web globals.css; left intact.
- Browser visual/authenticated UI E2E not yet verified. None of these tests prove live bank/mailbox/production readiness.

Run backend tests with dedicated disposable `FINANCE_TEST_DATABASE_URL` (never production DATABASE_URL fallback), optional `FINANCE_N8N_PROBE_PATH`, and `GOCACHE=/tmp/superapp-go-cache go test ./...`. Test creates/drops unique schemas. Runtime API still needs explicit schema migration; AutoMigrate does not create finance schema.

## Contracts, files and handoff

Baseline: read-only FinRL `docs/integration/INTERSERVICE_CONTRACT_V1.md`, version "1". Central fixture copied verbatim: `shared/finance/import-event-v1.synthetic.json`; schema `shared/finance/import-event-v1.schema.json`. Synthetic parser recognizes only this labelled fixture, retains amount byte-span evidence, leaves account/date unresolved and never auto-posts.

Runbooks: `FINANCE_INGESTION.md` (scope/provisioning/Go–Node probe), `FINANCE_REVIEW.md` (review actions/revisions/journal atomicity).

New owned paths: `backend/internal/finance/*`, `backend/cmd/finance-review-worker/main.go`, `backend/migrations/000002_finance.up.sql`, `000003_storage_manifest.up.sql`, `000004_finance_review.up.sql`, `000005_extraction_runs.up.sql`, `backend/internal/repository/user_data_repository_test.go`, `shared/finance/*`, `web/app/finance/repository/*`, `docs/implementation/*`.

Targeted additions within existing user work: `backend/cmd/api/main.go` finance registration/CORS; existing `backend/internal/repository/user_data_repository.go`, `backend/internal/delivery/http/storage_handler.go`, `backend/internal/domain/context.go` revision/fingerprint guard. Existing 000001 migration is preserved, not authored here. Do not commit unrelated changes, tracked PostgreSQL data or compiled binaries. No central integration docs changed.

## Remaining / blockers / next

Independent next work: browser review QA, paginated journal detail/search and improved transaction-entry UX; explicit legacy preview/cutover; private vault/upload; statement reconciliation; goals/forecast; holdings; canonical mobile UI/cache integration; business extensions; retry/lease observability, backup/restore and hardening. Parser plugin interface is available, real formats are not implemented.

Real bank templates require anonymized samples. Live activation requires confirmed connection/entity owners, credentials/consent, vault provider and reachable staging/private-network configuration. Those are concrete activation gates, not blockers for synthetic development. Full REP/DOC/ING/planning/research/business blueprint is not claimed complete.

## Wave 2: BFF integrated locally with actual Python

Research BFF submit/status/report source implemented with fixed configured upstream, membership checks, backend-only delegation, bounded/no-redirect transport and safe errors. Added `SKIP_AUTO_MIGRATION=true` switch covering AutoMigrate and extension creation for least-privilege staging. Runbook/contracts: `FINANCE_RESEARCH_BFF.md`. Actual Go→Python/PostgreSQL test **passed** (real user JWT, membership, delegation, API/worker/scoring; synthetic data). Same-key replay, different-body409, invalid nested request422, cross-user/entity status+report404, viewer/revoked denial, honest include_laya failure and upstream-unavailable502 verified. No API/scoring/storage mocks. UI submit/poll/report implemented with synthetic/provider distinction, data_as_of/request as_of, baseline/version, sources, limitations, confidence explanation and rl_executed label. UI build verification pending latest change. No change to deployment-owned files or central integration docs.

Wave 2 owned additions: `backend/internal/finance/research_http.go`, `research_python_test.go`, `testdata/research_service.py`, `web/app/finance/repository/ResearchPanel.js`, `shared/finance/research-request-v1.synthetic.json`, `docs/implementation/FINANCE_RESEARCH_BFF.md`; additive env/main wiring and UI/CSS updates. No new migration or deployment-owned edits.

## Latest owner priorities / mobile slice

Confirmed priorities: BRI and BNI; VPS-to-VPS deployment; finance/research must be usable in mobile. Account ownership (personal/business), sender/templates and credential mapping remain unconfirmed. No assumptions made.

Wave 2 web ESLint/typecheck/production build **passed** after correcting ResearchPanel JS types. Mobile canonical screen `/finance-repository` is now implemented and linked from existing finance: entity selection/create, account create/read + exact-string balances, Inbox review/accept/match/reject/unresolved, research submit/status/report through the same Go BFF. It uses existing user auth, no delegated/integration tokens on device, no optimistic posted ledger. Shared client tests passed (5): Decimal preserved, replay/revision headers, server errors, user switch before/during requests, cache guards. Mobile typecheck result pending. Emulator/native runtime and authenticated device E2E are not yet verified.

BRI/BNI adapter registration contract + unknown-safe manual routing implemented with explicit reviewed sample fingerprint, parser version and matcher requirements. No actual bank templates registered. Authenticated GET `/api/v1/finance/bank-templates` reports both awaiting_anonymized_sample, ownership/sender unconfirmed. Bank hint is never account ownership or sender authenticity. Tests added; full backend regression pending this addition.
