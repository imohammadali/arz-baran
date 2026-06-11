# syntax=docker/dockerfile:1

ARG GO_VERSION=1.23

# --- Build stage ---
FROM golang:${GO_VERSION}-alpine AS builder

WORKDIR /src

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /out/api ./cmd/api

# --- Development / Compose runtime (healthcheck + migrations bundle) ---
FROM alpine:3.20 AS runtime

RUN apk add --no-cache ca-certificates wget \
    && adduser -D -u 65532 -g app app

WORKDIR /app

COPY --from=builder --chown=65532:app /out/api ./api
COPY --from=builder --chown=65532:app /src/migrations ./migrations

USER 65532

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=15s \
    CMD wget -qO- http://127.0.0.1:8080/health/live >/dev/null || exit 1

ENTRYPOINT ["./api"]

# --- Production-shaped runtime (distroless, no shell healthcheck) ---
FROM gcr.io/distroless/static-debian12:nonroot AS runtime-distroless

WORKDIR /app

COPY --from=builder --chown=nonroot:nonroot /out/api ./api
COPY --from=builder --chown=nonroot:nonroot /src/migrations ./migrations

EXPOSE 8080

ENTRYPOINT ["./api"]
