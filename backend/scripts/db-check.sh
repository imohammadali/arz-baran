#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

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

if ! command -v sqlc >/dev/null 2>&1; then
  echo "sqlc not found; run: make install-tools" >&2
  exit 1
fi

MIGRATIONS_DIR="${MIGRATIONS_DIR:-migrations}"
SCHEMA_OUT="sql/schema/schema.sql"
GEN_DIR="gen/sqlc"

echo "==> Applying migrations on clean check database"
goose -dir "${MIGRATIONS_DIR}" postgres "${DATABASE_URL}" up

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found; skipping schema drift check" >&2
else
  echo "==> Checking schema snapshot drift"
  TMP="$(mktemp)"
  trap 'rm -f "${TMP}"' EXIT

  pg_dump "${DATABASE_URL}" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-comments \
    > "${TMP}"

  # Compare body only (ignore header comments in committed file).
  BODY_TMP="$(mktemp)"
  trap 'rm -f "${TMP}" "${BODY_TMP}"' EXIT
  awk 'BEGIN{p=0} /^CREATE |^ALTER |^SET |^SELECT pg_catalog/{p=1} p' "${SCHEMA_OUT}" > "${BODY_TMP}" || true

  if ! diff -u "${BODY_TMP}" <(awk 'BEGIN{p=0} /^CREATE |^ALTER |^SET |^SELECT pg_catalog/{p=1} p' "${TMP}") >/dev/null; then
    echo "schema drift detected — run: make db-schema-sync" >&2
    diff -u "${BODY_TMP}" <(awk 'BEGIN{p=0} /^CREATE |^ALTER |^SET |^SELECT pg_catalog/{p=1} p' "${TMP}") || true
    exit 1
  fi
  echo "schema snapshot OK"
fi

echo "==> Compiling sqlc queries"
sqlc compile -f sqlc.yaml

echo "==> Checking generated sqlc drift"
GEN_BEFORE="$(mktemp -d)"
cp -a "${GEN_DIR}/." "${GEN_BEFORE}/"
sqlc generate -f sqlc.yaml

if ! diff -ru "${GEN_BEFORE}" "${GEN_DIR}" >/dev/null; then
  echo "sqlc generated code drift — run: make sqlc-generate and commit" >&2
  diff -ru "${GEN_BEFORE}" "${GEN_DIR}" || true
  exit 1
fi

echo "sqlc generated code OK"
echo "db-check passed"
