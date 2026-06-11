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

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found; install postgresql-client or use docker exec" >&2
  exit 1
fi

echo "Applying migrations from ${MIGRATIONS_DIR}..."
goose -dir "${MIGRATIONS_DIR}" postgres "${DATABASE_URL}" up

TMP="$(mktemp)"
trap 'rm -f "${TMP}"' EXIT

pg_dump "${DATABASE_URL}" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-comments \
  > "${TMP}"

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
