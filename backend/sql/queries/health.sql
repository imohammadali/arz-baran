-- name: Ping :one
SELECT 1::integer AS ok;

-- name: ListSchemaMetadata :many
SELECT key, value, updated_at
FROM schema_metadata
ORDER BY key;
