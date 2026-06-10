# Phase 1 — Ledger (Planned)

## Scope

- Tables: `accounts`, `transactions`, `ledger_entries`, `holds`
- Domain: Money, Direction, invariants
- LedgerService: PostTransaction, Hold, Release, Reverse
- Integration tests: idempotency, concurrency, double-entry balance

## Prerequisites

Phase 0 complete (Goose, sqlc, clean architecture skeleton).

## Not in scope

- users, sessions, JWT (Phase 2)
- HTTP public API for trading (Phase 3)
