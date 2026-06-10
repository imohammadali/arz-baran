-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_metadata (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_metadata (key, value) VALUES
    ('project', 'arz-baran'),
    ('phase', '0'),
    ('asset_scope', 'crypto')
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS schema_metadata;
