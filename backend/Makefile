.PHONY: help build run test tidy lint swagger-generate \
	migrate-up migrate-down migrate-status migrate-version \
	sqlc-generate sqlc-compile db-schema-sync db-check install-tools \
	docker-setup-env docker-clean docker-up docker-down docker-logs docker-reset docker-ready docker-debug-up

GO              := go
BINARY          := bin/api
MIGRATE_BIN     := bin/migrate
MIGRATIONS_DIR  := migrations
SQLC_CONFIG     := sqlc.yaml
SCHEMA_FILE     := sql/schema/schema.sql
GEN_SQLC_DIR    := gen/sqlc

GOOSE_VERSION   ?= v3.24.2
SQLC_VERSION    ?= v1.28.0

# Load .env when present for local DATABASE_URL construction.
ifneq (,$(wildcard .env))
include .env
export
endif

POSTGRES_USER     ?= exchange
POSTGRES_PASSWORD ?= change-me
POSTGRES_HOST     ?= localhost
POSTGRES_PORT     ?= 5432
POSTGRES_DB       ?= exchange
POSTGRES_SSLMODE  ?= disable

DATABASE_URL ?= postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(POSTGRES_HOST):$(POSTGRES_PORT)/$(POSTGRES_DB)?sslmode=$(POSTGRES_SSLMODE)

SWAG_VERSION    ?= v1.16.4

help:
	@echo "Application:"
	@echo "  build              Compile API binary"
	@echo "  run                Run API locally"
	@echo "  test               Run tests"
	@echo "  tidy               go mod tidy"
	@echo "  lint               go vet"
	@echo "  swagger-generate   Regenerate docs/ from swag annotations"
	@echo ""
	@echo "Database (see sql/README.md):"
	@echo "  install-tools      Install goose and sqlc CLIs"
	@echo "  migrate-up         Apply goose migrations"
	@echo "  migrate-down       Roll back one migration (dev only)"
	@echo "  migrate-status     Show migration status"
	@echo "  migrate-version    Print current migration version"
	@echo "  sqlc-generate      Generate gen/sqlc/*"
	@echo "  sqlc-compile       Verify sqlc queries compile"
	@echo "  db-schema-sync     Dump schema to $(SCHEMA_FILE)"
	@echo "  db-check           CI gate for schema + sqlc drift"
	@echo ""
	@echo "Docker:"
	@echo "  docker-up          Start compose stack"
	@echo "  docker-down        Stop compose stack"
	@echo "  docker-reset       Reset volumes and restart"
	@echo "  docker-ready       Wait for /health/ready"

build:
	$(GO) build -o $(BINARY) ./cmd/api

build-migrate:
	$(GO) build -o $(MIGRATE_BIN) ./cmd/migrate

run: build
	./$(BINARY)

test:
	$(GO) test ./...

tidy:
	$(GO) mod tidy

lint:
	$(GO) vet ./...

swagger-generate:
	$(GO) install github.com/swaggo/swag/cmd/swag@$(SWAG_VERSION)
	swag init -g ./cmd/api/main.go -o ./docs --parseInternal

install-tools:
	$(GO) install github.com/pressly/goose/v3/cmd/goose@$(GOOSE_VERSION)
	$(GO) install github.com/sqlc-dev/sqlc/cmd/sqlc@$(SQLC_VERSION)

migrate-up: install-tools
	goose -dir $(MIGRATIONS_DIR) postgres "$(DATABASE_URL)" up

migrate-down: install-tools
	goose -dir $(MIGRATIONS_DIR) postgres "$(DATABASE_URL)" down

migrate-status: install-tools
	goose -dir $(MIGRATIONS_DIR) postgres "$(DATABASE_URL)" status

migrate-version: build-migrate
	$(MIGRATE_BIN) version

sqlc-generate: install-tools
	sqlc generate -f $(SQLC_CONFIG)

sqlc-compile: install-tools
	sqlc compile -f $(SQLC_CONFIG)

db-schema-sync: install-tools
	@chmod +x scripts/db-schema-sync.sh
	DATABASE_URL="$(DATABASE_URL)" MIGRATIONS_DIR="$(MIGRATIONS_DIR)" ./scripts/db-schema-sync.sh

db-check: install-tools
	@chmod +x scripts/db-check.sh
	DATABASE_URL="$(DATABASE_URL)" MIGRATIONS_DIR="$(MIGRATIONS_DIR)" ./scripts/db-check.sh

# --- Docker (see docker/README.md) ---

ifeq ($(shell docker compose version >/dev/null 2>&1 && echo yes),yes)
COMPOSE ?= docker compose
else ifneq ($(shell command -v docker-compose 2>/dev/null),)
COMPOSE ?= docker-compose
else
COMPOSE ?= docker compose
endif

API_PORT ?= 8080
API_URL  ?= http://localhost:$(API_PORT)

docker-setup-env:
	@test -f .env || cp .env.example .env
	@echo "created .env from .env.example"

docker-clean:
	-$(COMPOSE) down --remove-orphans 2>/dev/null
	-docker rm -f exchange-api 2>/dev/null
	@docker ps -aq --filter label=com.docker.compose.project=exchange 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true

docker-up: docker-setup-env docker-clean
	$(COMPOSE) up -d --build --remove-orphans

docker-down:
	$(COMPOSE) down --remove-orphans

docker-logs:
	$(COMPOSE) logs -f api

docker-reset: docker-down
	$(COMPOSE) down -v --remove-orphans
	$(COMPOSE) up -d --build --remove-orphans

docker-ready:
	@echo "waiting for $(API_URL)/health/ready"
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do \
		curl -sf "$(API_URL)/health/ready" >/dev/null && exit 0; \
		sleep 2; \
	done; \
	echo "API not ready"; exit 1

docker-debug-up: docker-setup-env docker-clean
	$(COMPOSE) -f docker-compose.yml -f docker-compose.debug.yml up -d --build --remove-orphans
