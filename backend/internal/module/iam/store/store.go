// Package store defines IAM persistence ports (implemented via sqlc in gen/sqlc/iam).
package store

import (
	"context"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// Repository is the IAM persistence port.
type Repository interface {
	// Exists reports whether the user record exists.
	Exists(ctx context.Context, userID kernel.ID) (bool, error)
}
