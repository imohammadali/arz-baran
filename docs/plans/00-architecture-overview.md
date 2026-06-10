# arz-baran Backend Architecture Overview

## Principles

- Modular monolith first; microservices later
- Double-entry ledger as source of financial truth
- Never use float for money (`NUMERIC` + `shopspring/decimal`)
- All financial writes inside DB transactions
- Immutable ledger entries (reversal via new transaction)
- Goose migrations + sqlc + Echo + PostgreSQL + Redis

## High-Level Layers

```text
API (Echo) → Application (use cases) → Domain (rules) → Ports (interfaces) → Adapters (postgres, redis)
```

## Modules

| Module | Owns |
|--------|------|
| identity | users, sessions |
| ledger | accounts, transactions, ledger_entries, holds |
| wallet | wallets (metadata; balance from ledger) |
| trading | orders, trades |
| market | ticker, candles, WebSocket |
| platform | config, health, outbox |

**Rule:** Only the ledger module writes to ledger tables.

## Account Model (per user + asset)

```text
user:{id}:BTC:available
user:{id}:BTC:locked
user:{id}:BTC:pending_withdrawal
system:BTC:hot_wallet
exchange:BTC:pool
```

## Tech Stack

- Go 1.24+
- Echo, PostgreSQL, Redis, Docker
- Goose, sqlc, JWT (Phase 2+), WebSockets (Phase 5+)

## Phase Roadmap

| Phase | Focus |
|-------|-------|
| 0 | Foundation, health, Docker |
| 1 | Ledger (double-entry, holds, reversals) |
| 2 | Users, auth, wallets |
| 3 | Trading + matching engine |
| 4 | Market data + WebSocket |
| 5 | Security hardening |
