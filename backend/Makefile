.PHONY: up down logs migrate-up migrate-down sqlc run build test tidy

DATABASE_URL ?= postgres://arz_baran:arz_baran@localhost:5432/arz_baran?sslmode=disable

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

migrate-up:
	go run github.com/pressly/goose/v3/cmd/goose@v3.24.1 -dir migrations postgres "$(DATABASE_URL)" up

migrate-down:
	go run github.com/pressly/goose/v3/cmd/goose@v3.24.1 -dir migrations postgres "$(DATABASE_URL)" down

sqlc:
	sqlc generate

run:
	@go run ./cmd/api; exit 0

build:
	go build -o bin/api ./cmd/api

test:
	go test ./...

tidy:
	go mod tidy
