// Package api is the cross-module facade for IAM.
// Other modules depend on this package only — never on iam/service or iam/store.
package api

import (
	"context"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// API is the IAM module boundary.
type API interface {
	// UserExists reports whether a user ID is known to IAM.
	// Implementation deferred to Phase 0 IAM module work.
	UserExists(ctx context.Context, userID kernel.ID) (bool, error)
}
