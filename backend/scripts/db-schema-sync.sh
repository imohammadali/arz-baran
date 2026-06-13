#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SCHEMA_OUT="sql/schema/schema.sql"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-migrations}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  POSTGRES_USER="${POSTGRES_USER:-exchange}"
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-change-me}"
  POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
  POSTGRES_PORT="${POSTGRES_PORT:-5432}"
  POSTGRES_DB="${POSTGRES_DB:-exchange}"
  POSTGRES_SSLMODE="${POSTGRES_SSLMODE:-disable}"
  DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=${POSTGRES_SSLMODE}"
fi

if ! command -v goose >/dev/null 2>&1; then
  echo "goose not found; run: make install-tools" >&2
  exit 1
fi

echo "Applying migrations from ${MIGRATIONS_DIR}..."
goose -dir "${MIGRATIONS_DIR}" postgres "${DATABASE_URL}" up

TMP="$(mktemp)"
trap 'rm -f "${TMP}"' EXIT

# Prefer a local pg_dump; fall back to docker exec on the exchange-postgres container.
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "${DATABASE_URL}" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-comments \
    > "${TMP}"
elif docker inspect exchange-postgres >/dev/null 2>&1; then
  echo "pg_dump not found locally; using docker exec exchange-postgres..."
  docker exec exchange-postgres pg_dump "${DATABASE_URL}" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-comments \
    > "${TMP}"
else
  echo "pg_dump not found and exchange-postgres container is not running." >&2
  echo "Install postgresql-client or start the stack with: make docker-up" >&2
  exit 1
fi

# Strip psql-only directives (\restrict, \unrestrict) that sqlc cannot parse.
sed -i '/^\\[a-z]/d' "${TMP}"

{
  cat <<'HEADER'
-- Schema snapshot for sqlc.
-- DO NOT EDIT — regenerate with: make db-schema-sync
--
-- DDL source of truth: migrations/

HEADER
  cat "${TMP}"
} > "${SCHEMA_OUT}"

echo "Wrote ${SCHEMA_OUT}"
