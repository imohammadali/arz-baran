# ADR-001: Double-Entry Ledger Model

**Status:** Accepted
**Date:** 2026-06
**Deciders:** Backend team

---

## Context

The naive approach to user balance management is a single `balance` column on a `wallets` table, updated with `UPDATE wallets SET balance = balance - amount WHERE user_id = $1`. This approach has several critical problems for a financial exchange:

1. **No audit trail.** There is no record of _why_ a balance changed, making reconciliation and dispute resolution impossible.
2. **Race conditions.** Concurrent `UPDATE` statements on a single row are vulnerable to lost updates under high concurrency, even with `FOR UPDATE` locks.
3. **Silent corruption.** A bug that applies a wrong update is undetectable after the fact — the "correct" balance is gone.
4. **Non-reversibility.** Reversing a transaction requires either storing a log externally or guessing from balance diffs.
5. **Regulatory non-compliance.** Financial regulators (e.g., for MSB/VASP licences) expect a full, tamper-evident audit trail of every fund movement.

---

## Decision

Adopt a **double-entry ledger model** with the following rules, enforced at the domain and database layers:

1. **No balance column.** The `accounts` table has no `balance` column. Balance is always derived:
   ```sql
   SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
   FROM ledger_entries
   WHERE account_id = $1 AND asset_id = $2;
   ```

2. **Immutable LedgerEntries.** Rows in `ledger_entries` are append-only. There are no `UPDATE` or `DELETE` statements on this table. The database `CHECK (amount > 0)` constraint enforces positive amounts; direction carries the sign.

3. **Double-entry invariant.** Every `Transaction` must satisfy: for each `asset_id` present in its entries, `sum(credits) == sum(debits)`. This is enforced by `validateDoubleEntry` in `wallet/domain/ledger.go` _before_ any database write.

4. **NUMERIC(36,18) storage.** All `amount` columns in `ledger_entries` and `holds` use `NUMERIC(36,18)`. This supports up to 18 digits of integer precision and 18 decimal places — sufficient for all supported assets, including Ethereum (18 decimals) and future sub-satoshi denomination. `FLOAT` and `DOUBLE PRECISION` are strictly forbidden.

5. **Idempotency keys.** The `transactions` table has a `UNIQUE` constraint on `idempotency_key`. Duplicate transaction submissions are rejected at the database level, never silently ignored.

6. **Transaction lifecycle.** A `Transaction` starts `pending` and transitions to `completed` (or `reversed`) exactly once. Completed and reversed transactions are immutable.

---

## Consequences

### Positive

- **Full audit trail.** Every fund movement is permanently recorded with a timestamp, transaction type, and idempotency key.
- **Balance cannot be corrupted.** Concurrent writes append rows rather than updating a shared cell; the `SUM` query is always consistent with the written rows.
- **Reversals are first-class.** To reverse a transaction, create a new transaction with the debits and credits swapped — no data is ever deleted.
- **Reconciliation is deterministic.** `sum(all credits) − sum(all debits)` for any account must equal the expected on-chain balance. Any discrepancy is immediately detectable.
- **Holds are transparent.** `available_balance = posted_balance − sum(active_hold amounts)` is derivable from stored data at any point in time.

### Negative / Trade-offs

- **Higher query cost for balance reads.** A `SELECT SUM` over potentially millions of `ledger_entries` rows is more expensive than reading a single column. This is mitigated with:
  - A composite index on `(account_id, asset_id)`.
  - A read-model (materialized balance cache) added in Phase 2 for the hot path.
- **More complex writes.** Depositing funds requires constructing a balanced `Transaction` with at least two `LedgerEntry` rows instead of a single `UPDATE`.
- **Schema is append-only.** Historical entry correction requires a compensating transaction, not an `UPDATE`. This is a feature, not a bug, from an audit perspective.
