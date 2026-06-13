# ADR-002: Decimal Type for Monetary and Quantity Values

**Status:** Accepted
**Date:** 2026-06
**Deciders:** Backend team

---

## Context

Cryptocurrency exchanges handle arithmetic on values with up to 18 decimal places (Ethereum) and must never introduce rounding errors. The standard Go `float64` type — and PostgreSQL `FLOAT` / `DOUBLE PRECISION` — use IEEE 754 binary floating-point representation, which cannot exactly represent most decimal fractions:

```go
// float64 arithmetic — WRONG for financial use
0.1 + 0.2 == 0.3  // false: result is 0.30000000000000004
```

A rounding error of `0.000000000000001` on a position worth 1,000,000 USDT is a real, reportable financial loss. Exchanges have been exploited through floating-point discrepancies in balance checks and fee calculations.

---

## Decision

### Go layer — `github.com/shopspring/decimal`

All monetary amounts, asset quantities, order prices, order sizes, and fee values **must** use `decimal.Decimal` from `github.com/shopspring/decimal`.

Rules:
- `float64`, `float32`, and `int`-based fixed-point (e.g., `int64` satoshis) are **forbidden** for domain-level monetary values.
- Construct decimals from strings or integer constants only: `decimal.NewFromString("0.00001")`, `decimal.NewFromInt(100)`.
- Never construct from a `float`: `decimal.NewFromFloat(0.1)` is **forbidden** — it silently introduces the float's imprecision.
- Use `a.Equal(b)` for equality, never `a == b` (the underlying struct comparison ignores scale normalization).
- JSON serialization of `decimal.Decimal` produces a quoted string (e.g., `"1.50000000"`), preserving exact precision across API boundaries.

### PostgreSQL layer — `NUMERIC(36,18)`

All `amount`, `price`, `quantity`, `min_order_size`, and `max_order_size` columns use `NUMERIC(36,18)`.

- 36 total significant digits, 18 after the decimal point.
- Supports the full range of all assets: BTC (8 decimals), USDT (6), ETH (18), IRT (0).
- `FLOAT`, `DOUBLE PRECISION`, and `DECIMAL` with fewer than 18 decimal places are **forbidden** on financial columns.

### sqlc mapping

The `walletdb` sqlc block maps `numeric` → `decimal.Decimal` via the `overrides` section in `sqlc.yaml`. Where sqlc falls back to `pgtype.Numeric` (e.g., in the `instrumentdb` model), the store layer must convert manually before returning domain types.

---

## Consequences

### Positive

- **Exact arithmetic.** `0.1 + 0.2` equals exactly `0.3`. No accumulation of rounding errors across millions of trades.
- **Consistent serialization.** API responses carry decimal strings, preventing client-side float conversion issues.
- **Database integrity.** `NUMERIC` arithmetic in PostgreSQL (e.g., `SUM` in balance queries) is also exact.
- **Auditability.** Every stored amount is exactly what the domain computed — no silent truncation.

### Negative / Trade-offs

- **Performance.** `decimal.Decimal` arithmetic is 10–50× slower than `float64`. This is acceptable for an exchange backend where correctness outweighs raw throughput on individual calculations. Hot paths (matching engine) use integer-based fixed-point arithmetic internally and convert at boundaries.
- **Verbosity.** Constructors and comparisons are more verbose than native operators.
- **JSON as string.** Clients must parse the amount as a string/decimal, not a JSON number. This is the correct behaviour and matches the industry standard (Binance, Coinbase Pro APIs use string amounts).

---

## Enforcement

- The `internal/kernel/money.go` type uses `decimal.Decimal` for `Amount`.
- All domain constructors (`NewLimitOrder`, `NewLedgerEntry`, `NewHold`, etc.) accept `decimal.Decimal` parameters and validate with `.IsPositive()`.
- Code review must reject any PR that introduces `float64` for a monetary or quantity value.
