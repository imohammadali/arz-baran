# Database tooling

DDL is owned by **Goose** (`migrations/`). Typed queries are owned by **sqlc** (`sql/queries/` → `gen/sqlc/`).

## Layout

```
migrations/              # Goose SQL migrations (single ordered sequence)
sql/
  schema/schema.sql      # sqlc schema snapshot (regenerate via make db-schema-sync)
  queries/
    platform/            # platform queries (health, etc.)
    iam/                 # added with IAM migrations (00010+)
    wallet/              # added with wallet migrations (00020+)
    instrument/          # added with instrument migrations (00030+)
gen/sqlc/                # generated Go code — commit after sqlc generate
sqlc.yaml                # sqlc configuration
```

## Migration version bands

| Range | Module |
|-------|--------|
| 00001–00009 | platform |
| 00010–00019 | iam |
| 00020–00029 | wallet |
| 00030–00039 | instrument |

Filename: `{version}_{module}_{description}.sql`

## Commands

```bash
make install-tools     # install pinned goose + sqlc CLIs
make migrate-up        # apply migrations
make migrate-down      # roll back one (dev only)
make migrate-status    # show goose status
make sqlc-generate     # generate gen/sqlc/*
make sqlc-compile      # verify sqlc queries compile
make db-schema-sync    # goose up + pg_dump → sql/schema/schema.sql
make db-check          # CI gate: schema + sqlc drift
```

Or use the Go migrate binary:

```bash
go run ./cmd/migrate up
go run ./cmd/migrate status
```

## Workflow (schema change)

1. Add `migrations/000XX_module_change.sql`
2. `make migrate-up`
3. `make db-schema-sync`
4. Add or update `sql/queries/<module>/*.sql`
5. `make sqlc-generate`
6. Commit migration, `sql/schema/schema.sql`, and `gen/sqlc/`

## CI check

`make db-check` requires a running Postgres (`DATABASE_URL` or docker stack).

```bash
make docker-up
make db-check
```
