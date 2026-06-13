-- +goose Up
CREATE TABLE transactions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT        NOT NULL UNIQUE,
    type            TEXT        NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'trade_settlement', 'hold_placement', 'hold_release')),
    status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'reversed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);
CREATE INDEX idx_transactions_idempotency ON transactions(idempotency_key);
CREATE INDEX idx_transactions_status ON transactions(status);

-- +goose Down
DROP TABLE IF EXISTS transactions;
