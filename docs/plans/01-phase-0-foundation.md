# Phase 0 — Production Foundation

## Goal

Rebuild the backend foundation: clean architecture skeleton, Goose migrations, sqlc scaffold, Docker, Echo health API, dependency injection — ready for Phase 1 Ledger.

## Deliverables

- `docs/plans/` documentation
- Platform layer: config, logger, postgres (WithTx), redis
- Goose migration `00001_init.sql` (pgcrypto + schema_metadata)
- sqlc health queries
- `GET /health/live`, `GET /health/ready`
- docker-compose (Postgres + Redis on 6380)
- Makefile: up, migrate-up, sqlc, run, build

## Verification

```bash
cd backend
cp .env.example .env
make up && make migrate-up && make sqlc && make run
curl localhost:1323/health/live
curl localhost:1323/health/ready
```

## Next

Phase 1: Ledger (`accounts`, `transactions`, `ledger_entries`, `holds`)
