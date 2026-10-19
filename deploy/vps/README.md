# Whenya on a VPS

This stack runs PostgreSQL, a one-shot schema migration, the Go API, Next.js,
and Caddy HTTPS. Only ports 80/443 are published. Mobile is distributed separately.
Supabase Auth remains an external dependency; this does not install Supabase.
The existing root Compose file and `deploy/sumopod` remain separate deployment options.
Do not run these stacks with the same Compose project name on the same host.

## Requirements and configuration

- Docker Engine with Compose v2.30+; Node.js is only needed by the release packager.
- A domain with A/AAAA records pointing to the VPS. Ports 80/443 must be available
  and reachable; retain SSH access. Remove stale AAAA records if IPv6 is unavailable.
- A Supabase project and its public anon/publishable key. Use the same project in
  web, mobile and API. Configure Supabase Auth Site URL and allowed redirect URLs
  for `https://YOUR_DOMAIN` and the mobile deep links.
- A new, empty application database. The migration runner refuses untracked existing
  schemas, including databases previously initialized using `backend/sql/init.sql`.
  Existing installations need backup and explicit schema reconciliation first.

From this directory (or the extracted installer):

```sh
cp .env.example .env
cp api.env.example api.env
cp web.env.example web.env
chmod 600 .env api.env web.env
```

Edit `.env`: domain, ACME email, a random hexadecimal database password
(`openssl rand -hex 32`), Supabase URL and public key. Database username/name should
use simple letters, digits and underscores; the password is embedded in a URI,
so use hexadecimal rather than URI-reserved characters. Never use a Supabase
service-role key for the public key. Optional AI secrets go in `api.env`;
server-side Midtrans credentials go in `web.env`.

## Missing SUPABASE_URL during Compose interpolation

Compose reads installation settings from `deploy/vps/.env`. The container's
`api.env`, the repository root `.env`, and `web/.env.local` do not supply these
interpolation values automatically. Set these names in the installation `.env`:

```dotenv
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

Use the actual values from the same Supabase project used by the clients. Existing
web configuration calls them `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`; copy their values under the names above. Do not
include `/auth/v1` in `SUPABASE_URL`; Compose appends the authentication paths.

From the repository root, explicitly select both the Compose file and env file:

```sh
docker compose --env-file deploy/vps/.env -f deploy/vps/compose.yaml config --quiet
docker compose --env-file deploy/vps/.env -f deploy/vps/compose.yaml up -d --build
```

An exported empty shell variable can override a populated env-file entry. If that
happens, run `unset SUPABASE_URL SUPABASE_ANON_KEY` and retry. Do not print rendered
Compose configuration in shared logs; use `config --quiet` to validate it.

## First installation from source

Run at `deploy/vps` inside the repository:

```sh
docker compose config --quiet
docker compose build api web
docker compose up -d
```

The database health check gates migrations; API startup waits for migrations to
succeed, and the proxy waits for the web health check. Migrations are embedded in
the API image, applied transactionally and tracked with checksums. Never edit a
previously applied SQL migration; add a new numbered `.up.sql` instead. AutoMigrate
is disabled in this stack. Failed migrations roll back and block API startup.
The runtime database role currently also owns the schema; split migration/runtime
roles separately if the deployment requires least-privilege database access.

## Automated release builds

The **VPS images and installer** GitHub Actions workflow is manually dispatched.
Set repository Actions variables `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (public project values). Supply a target domain
and a new release tag when running the workflow. It publishes Linux amd64/arm64
images to `ghcr.io/OWNER/REPO-api:TAG` and `ghcr.io/OWNER/REPO-web:TAG` and uploads
the installer as a workflow artifact. Image names are lowercased. Set those exact
paths and tag in the VPS `.env`. Download the artifact or attach it to a GitHub
Release. No workflow was run or image published by adding these files.

The **VPS deployment checks** workflow validates migrations on PostgreSQL 16,
builds both container images and checks installer/Caddy configuration on pull requests.

## Distribute without source code or Drive

On a build machine with registry credentials, configure `.env` for the intended
deployment, including `API_IMAGE`, `WEB_IMAGE` and `WHENYA_RELEASE`, for example
`ghcr.io/YOUR_ORG/whenya-api`, `ghcr.io/YOUR_ORG/whenya-web` and `v1.0.0`.
Use a new tag for every release; do not overwrite released tags.

```sh
docker login ghcr.io
docker compose build api web
docker compose push api web
./package.sh /tmp/whenya-installer.tar.gz
```

The build machine must target the VPS architecture (for example Linux amd64);
use a matching Linux builder or Buildx for cross-platform image publishing.
Publish the installer archive as a GitHub Release asset or serve it from your
release website. The packager removes build instructions and includes only
Compose, Caddy, docs and example environment files. It never packages real secrets.
For public repositories, decide whether registry images should also be public.

On the VPS, extract the archive, configure the three env files as above, and set
the **same image paths and release tag** used by the publisher. For private images,
log in to the registry with read-only credentials. Then:

```sh
docker compose config --quiet
docker compose pull
docker compose up -d
```

`NEXT_PUBLIC_*` values are baked into Next.js during image build. A web image is
specific to its configured domain/Supabase project/public payment configuration.
Changing those values on the VPS does not rewrite the browser bundle: rebuild and
publish the web image. Keep matching build configuration with each release.
No database URL, JWT secret or payment server key is a web build argument.

## Verify and operate

```sh
docker compose ps -a
docker compose logs --tail=100 migrate api web proxy
curl --fail https://YOUR_DOMAIN/api/health
# Expected: 401, without any user data
curl -i https://YOUR_DOMAIN/api/v1/storage
```

Test web login, an authenticated storage write/read and mobile login against the
same backend. `/health` only checks process reachability, not all feature dependencies.
Caddy routes `/api/v1/*` to Go while `/api/checkout` and payment webhook routes stay
on Next.js. HTTPS certificates and database data use persistent named volumes.

For mobile builds set `EXPO_PUBLIC_API_URL=https://YOUR_DOMAIN/api/v1` and matching
Supabase public values. Build and distribute through the existing Expo workflow;
mobile does not run as a container in this stack.

AI requires optional API keys. FinLab research and private staging document storage
are disabled by default. The finance review worker is not a continuous production
worker in this stack. Payment checkout currently selects sandbox mode in application
code: do not enable live payments just by changing deployment environment values.

## Backup, updates and rollback

Before updates, stop application writers and make a database backup. Keep maintenance
active until migrations finish. For the first deployment there is no old API to stop.
In a distributed system, also pause external integrations that can write to the DB.

```sh
docker compose stop proxy web api
umask 077
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backup.dump
```

Store backups securely off the VPS and test restores to a separate database.
Set a new `WHENYA_RELEASE`, then, for the source-free installer:

```sh
docker compose pull
# Run migrations explicitly on every upgrade, even when an old migrate container exists.
docker compose run --rm migrate
docker compose up -d --force-recreate migrate api web proxy
```

For source builds replace `pull` with `build api web`. Migration reruns are safe
because applied versions are tracked. If migration fails, inspect logs before
bringing writers back. Retain the previous images and environment configuration.
App rollback means selecting the previous tag and starting API/web only after
confirming schema compatibility. Image rollback does not roll back the database.
A database restore needs a planned maintenance window and the correct backup.

`docker compose down` stops the stack while retaining volumes. **Do not use
`docker compose down -v` for an installation whose data must be retained.**

Implementation references: [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
and [Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/).

## Reuse an existing Caddy (for example n8n)

If `n8n-caddy-1` already publishes ports 80/443 on network `n8n_default`, use
`compose.existing-proxy.yaml`. It puts only API/web on that external network
with unique aliases and disables the bundled proxy by default. The database
stays on the Whenya network. Set `CADDY_NETWORK` in `.env` if the name differs.
Keep `ACME_EMAIL` populated because the base Compose still interpolates it;
certificate settings in this mode are controlled by the existing Caddy.

From `deploy/vps`, remove only the failed bundled proxy and recreate API/web:

```sh
docker compose stop proxy
docker compose rm -f proxy
docker compose -f compose.yaml -f compose.existing-proxy.yaml config --quiet
docker compose -f compose.yaml -f compose.existing-proxy.yaml up -d
```

Back up the existing Caddyfile. Append the block from
`Caddyfile.existing-proxy.example`, replacing `app.example.com` with the exact
`APP_DOMAIN` configured at web build time. Preserve existing n8n/other site blocks.
For the host mount `/home/ubuntu/n8n/Caddyfile`:

```sh
sudo cp -p /home/ubuntu/n8n/Caddyfile /home/ubuntu/n8n/Caddyfile.before-whenya
sudo nano /home/ubuntu/n8n/Caddyfile
sudo docker exec n8n-caddy-1 caddy validate --config /etc/caddy/Caddyfile
# Run only after validation succeeds:
sudo docker exec n8n-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

If a backup already exists, give the next backup a distinct name. Check
`https://YOUR_DOMAIN/api/health`, then login and authenticated storage access.
Always include both Compose files for subsequent up/build/update operations;
running the base file alone would try to start the bundled proxy again.
The existing Caddy deployment must retain this external network when recreated.
