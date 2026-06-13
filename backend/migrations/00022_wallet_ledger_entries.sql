-- +goose Up
CREATE TABLE ledger_entries (
    id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID           NOT NULL REFERENCES transactions(id),
    account_id     UUID           NOT NULL REFERENCES accounts(id),
    direction      TEXT           NOT NULL CHECK (direction IN ('debit', 'credit')),
    amount         NUMERIC(36,18) NOT NULL CHECK (amount > 0),
    asset_id       TEXT           NOT NULL,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ledger_entries_account_id ON ledger_entries(account_id);
CREATE INDEX idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_account_asset ON ledger_entries(account_id, asset_id);

-- +goose Down
DROP TABLE IF EXISTS ledger_entries;
