-- +goose Up
CREATE TABLE assets (
    id         TEXT        PRIMARY KEY,
    symbol     TEXT        NOT NULL UNIQUE,
    name       TEXT        NOT NULL,
    decimals   INT         NOT NULL CHECK (decimals >= 0 AND decimals <= 18),
    is_enabled BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trading_pairs (
    id                 TEXT           PRIMARY KEY,
    base_asset_id      TEXT           NOT NULL REFERENCES assets(id),
    quote_asset_id     TEXT           NOT NULL REFERENCES assets(id),
    min_order_size     NUMERIC(36,18) NOT NULL CHECK (min_order_size > 0),
    max_order_size     NUMERIC(36,18) NOT NULL,
    price_precision    INT            NOT NULL CHECK (price_precision >= 0),
    quantity_precision INT            NOT NULL CHECK (quantity_precision >= 0),
    is_enabled         BOOLEAN        NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CHECK (base_asset_id != quote_asset_id),
    CHECK (max_order_size >= min_order_size)
);

INSERT INTO assets (id, symbol, name, decimals) VALUES
    ('BTC',  'BTC',  'Bitcoin',       8),
    ('USDT', 'USDT', 'Tether USD',    6),
    ('ETH',  'ETH',  'Ethereum',      18),
    ('IRT',  'IRT',  'Iranian Toman', 0);

INSERT INTO trading_pairs (id, base_asset_id, quote_asset_id, min_order_size, max_order_size, price_precision, quantity_precision) VALUES
    ('BTC_USDT', 'BTC', 'USDT', 0.00001, 100, 2, 5);

-- +goose Down
DROP TABLE IF EXISTS trading_pairs;
DROP TABLE IF EXISTS assets;
