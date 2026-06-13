-- name: GetAsset :one
SELECT * FROM assets WHERE id = $1;

-- name: GetAssetBySymbol :one
SELECT * FROM assets WHERE symbol = $1;

-- name: ListEnabledAssets :many
SELECT * FROM assets WHERE is_enabled = true ORDER BY symbol;

-- name: GetTradingPair :one
SELECT * FROM trading_pairs WHERE id = $1;

-- name: ListEnabledTradingPairs :many
SELECT * FROM trading_pairs WHERE is_enabled = true ORDER BY id;
