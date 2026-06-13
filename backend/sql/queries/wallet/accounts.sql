-- name: GetOrCreateAccount :one
INSERT INTO accounts (id, user_id, asset_id, account_type)
VALUES (gen_random_uuid(), $1, $2, $3)
ON CONFLICT (user_id, asset_id, account_type) DO UPDATE SET user_id = EXCLUDED.user_id
RETURNING *;

-- name: LockAccountForUpdate :one
SELECT id, user_id, asset_id, account_type, created_at
FROM accounts
WHERE id = $1
FOR UPDATE;

-- Cast to text so sqlc emits string instead of interface{}.
-- Parsed as decimal.Decimal in the store adapter.
-- name: GetAvailableBalance :one
SELECT COALESCE(
    SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END),
    0
)::text AS balance
FROM ledger_entries
WHERE account_id = $1 AND asset_id = $2;

-- name: InsertTransaction :one
INSERT INTO transactions (id, idempotency_key, type, status)
VALUES ($1, $2, $3, 'pending')
RETURNING *;

-- name: GetTransactionByIdempotencyKey :one
SELECT id, idempotency_key, type, status, created_at, completed_at
FROM transactions
WHERE idempotency_key = $1;

-- name: CompleteTransaction :one
UPDATE transactions SET status = 'completed', completed_at = NOW()
WHERE id = $1 AND status = 'pending'
RETURNING *;

-- name: InsertLedgerEntry :one
INSERT INTO ledger_entries (id, transaction_id, account_id, direction, amount, asset_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: InsertHold :one
INSERT INTO holds (id, account_id, amount, asset_id, idempotency_key)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetHold :one
SELECT id, account_id, amount, asset_id, status, idempotency_key, created_at, updated_at
FROM holds
WHERE id = $1;

-- name: GetHoldByIdempotencyKey :one
SELECT id, account_id, amount, asset_id, status, idempotency_key, created_at, updated_at
FROM holds
WHERE idempotency_key = $1;

-- name: ReleaseHold :one
UPDATE holds SET status = 'released', updated_at = NOW()
WHERE id = $1 AND status = 'active'
RETURNING *;

-- name: SettleHold :one
UPDATE holds SET status = 'settled', updated_at = NOW()
WHERE id = $1 AND status = 'active'
RETURNING *;
