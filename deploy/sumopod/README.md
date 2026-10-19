# Whenya API — Sumopod VPS

Prepared configuration; no server has been deployed by adding these files.

## Inputs required

- VPS public IP/host, SSH user, port, and existing SSH-key path or an authenticated terminal.
- API domain and DNS access; the chosen database and Supabase auth project.
- Read-only inspection of running services, free memory/disk, ports 80/443/18080, Docker and existing reverse proxy before changing the server.

Use a separate release directory on the VPS. Copy backend source plus this deploy directory, preserving their relative paths. Exclude `.env*` (except examples), local database files, binaries, logs and `.git`. Transfer real environment files separately over SSH with permissions 0600. Do not upload the entire working tree, which includes unrelated web/mobile work and local data.

## Configure

Create `deploy/sumopod/api.env` from `api.env.example` with the actual server-side database and JWT verifier settings. Create `.env` from `.env.example` for the actual hostname and release label.

The service always disables ORM AutoMigrate. Inspect the target schema and back it up before applying any missing migrations. `backend/migrations/000001_user_data.up.sql` requires the existing `users` table; subsequent finance SQL is not safely rerunnable. A brand-new database needs the core domain schema initialized first. Do not point this service at an empty database and assume `/health` means every module is ready. Do not blindly run every SQL file against an existing database.

No database container or publicly exposed database port is added here. Reuse the database chosen for deployment, or add a private database after inspecting the VPS and deciding storage/backup requirements.

## Build and start

From this directory, after schema and config validation:

```sh
docker compose config --quiet
docker compose build api
docker compose up -d api
curl --fail http://127.0.0.1:18080/health
```

Base configuration only binds the API to server loopback. With an existing Nginx/Caddy/Traefik, add the selected API hostname there and proxy to `127.0.0.1:18080`, preserving `/api/v1`.

If ports 80/443 are unused and DNS A/AAAA records point to this VPS, the optional Caddy overlay provides HTTPS:

```sh
docker compose -f compose.yaml -f compose.https.yaml config --quiet
docker compose -f compose.yaml -f compose.https.yaml up -d
```

Do not start this overlay over an existing reverse proxy. Ensure the VPS/provider firewall permits HTTP/HTTPS while retaining SSH access. Do not flush existing firewall rules.

## Verify

- `https://ACTUAL_API_HOST/health` returns `OK` through HTTPS.
- An unauthenticated request to `/api/v1/storage` returns 401; it must not return user data.
- A valid Supabase user can call the intended endpoint with its access token, and no other user's data is returned.
- Check database-backed endpoints, logs, browser CORS/preflight and mobile login/API calls. AI/document/research modules remain unavailable until their optional dependencies are configured.
- The finance review worker is a staging one-shot tool, not a deployed continuous production worker. Do not assume async imports are fully operational from deploying the API alone.

`/health` currently verifies process reachability only. It is not a database-readiness or full-feature test.

## Mobile and web

Set the following at build time, using the real hostname:

```env
EXPO_PUBLIC_API_URL=https://ACTUAL_API_HOST/api/v1
NEXT_PUBLIC_API_URL=https://ACTUAL_API_HOST/api/v1
```

Keep the same Supabase URL/public key for clients and verifier for the API. Database URLs, JWT signing secrets and AI credentials stay server-side. Rebuild the APK after setting its API URL.

## Rollback

Build each release with a distinct `WHENYA_RELEASE` image tag. Retain the previous image and release directory/config. Roll back the application by selecting its prior tag and running `docker compose up -d --no-build api` with that release's configuration. App rollback does not undo schema changes; database recovery requires the inspected backup/migration plan. Do not delete database or certificate volumes during application rollback.
