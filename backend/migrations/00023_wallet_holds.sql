-- +goose Up
CREATE TABLE holds (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID           NOT NULL REFERENCES accounts(id),
    amount          NUMERIC(36,18) NOT NULL CHECK (amount > 0),
    asset_id        TEXT           NOT NULL,
    status          TEXT           NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'settled')),
    idempotency_key TEXT           NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_holds_account_id ON holds(account_id);
CREATE INDEX idx_holds_status ON holds(status);

-- +goose Down
DROP TABLE IF EXISTS holds;
