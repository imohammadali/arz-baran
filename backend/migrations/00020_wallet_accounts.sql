-- +goose Up
CREATE TABLE accounts (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL,
    asset_id     TEXT        NOT NULL,
    account_type TEXT        NOT NULL CHECK (account_type IN ('user', 'system', 'fee', 'insurance')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, asset_id, account_type)
);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- +goose Down
DROP TABLE IF EXISTS accounts;
