# Manual review v1 (source/staging)

Apply migrations 000002–000005 explicitly after users and existing storage schema. The one-shot review worker creates unresolved candidates and immutable extraction runs; it only recognizes the labelled central synthetic fixture. Every other template stays unsupported/manual. No real bank format is claimed. Evidence spans use UTF-8 byte offsets, unresolved account/date remain null, and output always requires manual review.

`POST /api/v1/finance/entities/:entity/imports/:id/review` uses the existing user JWT, active owner/editor membership and Idempotency-Key. The source must have been routed by the worker. Body:

```json
{"expected_revision":1,"action":"unresolved","reason":"Account mapping remains ambiguous"}
```

Actions:

- `unresolved`: increments revision and keeps needs_review.
- `reject`: records reason and terminal rejected candidate, source processing completed.
- `match_existing`: additionally requires existing_journal_id on this entity; only links evidence, no new journal.
- `accept_new`: additionally requires journal object `{kind:"standard"|"transfer",effective_date:"YYYY-MM-DD",lines:[{account_id,side:"debit"|"credit",money:{amount:"decimal",currency:"IDR"}}]}`. Human-supplied balanced lines must pass account/entity/currency validation. One atomic transaction posts journal, decision/audit, candidate revision and outbox. No LLM posting capability.

Same key/body replays the original decision. Changed key/body or stale revision returns 409. Accepted/matched/rejected candidate revisions are terminal. Corrections to posted journals use reversal; deleting or mutating journal/audit records is prohibited. UI at `/finance/repository` supports unresolved/reject/match and explicit accept-new with human-selected date/accounts/decimal amount. The server independently validates and confirms the journal. Viewers cannot see write controls and server independently blocks writes. No optimistic journal state.

GET entity imports includes candidate revision/review_state and a source text preview (up to 4000 characters). Transport source `completed` is a processing state, never proof of a posted journal; use review_state/journal linkage. Rejected/matched/accepted all complete processing with different accounting effects.

Tests use dedicated PostgreSQL: matching leaves journal count unchanged; four concurrent same-key accepts create one journal; audit failure rolls back journal and candidate; changed replay/stale decisions rejected. Synthetic fixtures only. UI lint/typecheck pass; end-to-end browser review with confirmed staging identity remains pending.
