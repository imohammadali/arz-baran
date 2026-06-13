// Package store defines trading persistence ports (implemented via sqlc in gen/sqlc/trading).
package store

import (
	"context"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	"github.com/imohammadali/arz-baran/backend/internal/module/trading/domain"
)

// Repository is the trading persistence port.
type Repository interface {
	// SaveOrder persists a new Order.
	SaveOrder(ctx context.Context, order *domain.Order) error
	// FindOrder retrieves an Order by ID.
	FindOrder(ctx context.Context, orderID kernel.ID) (*domain.Order, error)
}
