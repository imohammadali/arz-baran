// Package store defines wallet persistence ports (implemented via sqlc in gen/sqlc/wallet).
package store

import (
	"context"
)

// Repository is the wallet persistence port.
type Repository interface {
	// Placeholder methods added after ADR-001 and migration band 00020-00029.
	Ping(ctx context.Context) error
}
