-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- +goose Down
-- NOOP: extension removal not required for development rollback.
