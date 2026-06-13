-- +goose Up
CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'pending_verification'
                              CHECK (status IN ('active', 'suspended', 'pending_verification')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_users_email ON users(lower(email));
CREATE INDEX idx_users_status ON users(status);

-- +goose Down
DROP TABLE IF EXISTS users;
