# Web → PostgreSQL migration

## Status and scope

The first implementation phase adds a safe migration path from the web cache to
PostgreSQL. It does **not** delete browser data and it does not yet switch every
screen to database-first reads. That cutover should happen only after production
authentication and restore/offline behavior have been tested.

## Data flow

1. The Settings page inventories keys belonging to the active profile from
   localForage and legacy localStorage.
2. Authentication keys, session tokens, encryption passwords, and sync IDs are
   excluded.
3. The browser creates a SHA-256 checksum for each JSON payload.
4. `POST /api/v1/storage/migrations` writes all entries in one PostgreSQL
   transaction. The request has an idempotency key, so retrying it is safe.
5. `GET /api/v1/storage` reads the stored checksums back.
6. The browser marks the migration verified only when every checksum matches.
   Local cache remains the rollback copy.

## Authentication prerequisite

The existing profile system creates local browser identities such as
`user_<random>`. These are not server identities and must never be trusted by the
API. The storage API takes the user ID only from a verified JWT `sub` claim.

Implemented:

- the web app links the active local profile to a Supabase account from
  **Settings → Akun Cloud** (email + password); the local profile, offline use,
  and name/avatar flow are preserved;
- the linked Supabase session is stored and re-established on reload
  (`shared/lib/cloudAuth.js`), so cloud features always have a fresh access token;
- the backend verifies Supabase access tokens against the project JWKS endpoint
  (`ES256`/`RS256`) with an optional HMAC fallback (`backend/internal/middleware/jwks.go`);
- a `users` row is auto-provisioned from the token `sub` on every authenticated
  request (`middleware.ProvisionUser`), so `user_data` foreign keys always resolve;
- `POST /users/sync` derives identity from the token, never the request body.

Configuration (see `backend/.env.example`):

```env
SUPABASE_JWKS_URL=https://<project>.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_ISSUER=https://<project>.supabase.co/auth/v1
SUPABASE_JWT_AUDIENCE=authenticated
# Optional legacy HS256 fallback; keep strong or leave empty.
JWT_SECRET=
```

Web and mobile must point at the **same** Supabase project as the API. The web
`.env.local` target was corrected accordingly. If a legacy HMAC secret is no
longer needed, remove `JWT_SECRET` and rely on JWKS only.

## Apply database migration

## Connection templates

For local Docker, copy `.env.postgres.example` to the repository root as
`.env`, replace both passwords, then run `docker compose up -d db pgadmin`.
Copy `backend/.env.example` to `backend/.env` and use:

```env
DATABASE_URL=postgres://selfone:YOUR_PASSWORD@localhost:5433/selfone?sslmode=disable
```

For a managed PostgreSQL provider, use its TLS URL instead (normally
`sslmode=require`). Never expose `DATABASE_URL` through a `NEXT_PUBLIC_*` or
`EXPO_PUBLIC_*` variable. The API now fails closed when `DATABASE_URL` is
missing and verifies the connection before accepting traffic.

Development can continue to use GORM `AutoMigrate`. Production should apply the
versioned SQL explicitly:

```bash
psql "$DATABASE_URL" --set ON_ERROR_STOP=1 \
  --file backend/migrations/000001_user_data.up.sql
```

Verify:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_data', 'data_migrations');
```

Rollback is destructive and should only be used before real migrations exist:

```bash
psql "$DATABASE_URL" --set ON_ERROR_STOP=1 \
  --file backend/migrations/000001_user_data.down.sql
```

## Rollout checklist

1. Back up PostgreSQL and keep the old web deployment available.
2. Apply SQL on staging.
3. Deploy backend, set `SUPABASE_JWKS_URL` / issuer / audience, and verify `/health`.
4. Configure `NEXT_PUBLIC_API_URL` with the `/api/v1` suffix plus the web Supabase URL/anon key.
5. Link a real cloud account from **Settings → Akun Cloud**.
6. Open **Settings → Migrasi ke PostgreSQL**, review item count, then migrate.
7. Compare the item count and checksum verification in the UI and database.
8. Repeat the same request to prove idempotency (no duplicate rows).
9. Test with a failed connection; local data must remain usable.
10. Roll out to a small cohort before database-first reads are enabled.

## Next phases

- Phase 2: add a database-first repository with local cache/offline queue and
  conflict policy.
- Phase 3: reuse the same contract in React Native/Expo and migrate AsyncStorage.
- Phase 4: run staged mobile builds, recovery testing, then store submission.

Do not remove local cache until at least one restore drill has loaded a clean
browser from PostgreSQL successfully.
