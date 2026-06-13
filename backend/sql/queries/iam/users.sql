-- name: CreateUser :one
INSERT INTO users (id, email, password_hash, status)
VALUES ($1, lower($2), $3, 'pending_verification')
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE lower(email) = lower($1);

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: UserExists :one
SELECT EXISTS(SELECT 1 FROM users WHERE id = $1) AS exists;

-- name: UpdateUserStatus :one
UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *;
