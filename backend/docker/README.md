# Docker environment

Local development stack: **API + PostgreSQL + Redis**.

## Quick start

```bash
cd backend
cp .env.example .env          # first time only
docker compose up -d --build
curl http://localhost:8080/health/ready
```

Default API URL: `http://localhost:8080`

## Compose files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Default dev stack |
| `docker-compose.debug.yml` | Publish Postgres `5432` and Redis `6379` to host |
| `docker-compose.ci.yml` | Ephemeral volumes, no auto-restart |
| `docker-compose.secrets.yml` | Mount secrets from `secrets/` (staging-shaped) |

## Profiles and overrides

```bash
# Default
docker compose up -d --build

# Debug (host DB/Redis ports)
docker compose -f docker-compose.yml -f docker-compose.debug.yml up -d

# Secret files instead of plaintext env passwords
docker compose -f docker-compose.yml -f docker-compose.secrets.yml up -d --build

# CI (clean DB each run)
docker compose -f docker-compose.yml -f docker-compose.ci.yml up --abort-on-container-exit --exit-code-from api
```

## Environment

| File | Committed | Purpose |
|------|-----------|---------|
| `.env.example` | Yes | Template — copy to `.env` |
| `.env` | No (gitignored) | Local overrides (`API_PORT`, passwords, log level) |
| `secrets/*` | No (gitignored) | Secret file mounts for `docker-compose.secrets.yml` |
| `secrets/*.example` | Yes | Templates for secret files |

### Key variables

| Variable | Default | Notes |
|----------|---------|-------|
| `API_PORT` | `8080` | Host port mapped to API |
| `POSTGRES_PASSWORD` | `change-me` | Must match postgres service |
| `REDIS_PASSWORD` | `change-me` | Must match redis service |
| `POSTGRES_RUN_MIGRATIONS` | `true` | Goose runs on API startup (dev only) |
| `APP_ENV` | `development` | Use `staging`/`production` rules only with matching config |

## Network

- Single internal bridge: `exchange-internal`
- Only **API** publishes a port to the host (unless `debug` override)
- Service DNS names: `postgres`, `redis`, `api`

## Volumes

| Volume | Purpose |
|--------|---------|
| `exchange-postgres-data` | PostgreSQL data |
| `exchange-redis-data` | Redis AOF |

Reset all data:

```bash
docker compose down -v
```

## Dockerfile targets

| Target | Use |
|--------|-----|
| `runtime` (default in compose) | Alpine + `wget` healthcheck, migrations bundled at `/app/migrations` |
| `runtime-distroless` | Production-shaped image without shell |

```bash
docker build --target runtime-distroless -t exchange-api:distroless .
```

## Makefile shortcuts

```bash
make docker-up
make docker-down
make docker-logs
make docker-reset    # down -v, rebuild, up
make docker-ready    # wait for /health/ready
```

## Startup order

1. Postgres and Redis start → healthchecks pass
2. API starts after dependencies are healthy
3. API runs Goose migrations when `POSTGRES_RUN_MIGRATIONS=true`
4. API binds `:8080`

Graceful shutdown: `docker compose stop api` (35s grace period).
