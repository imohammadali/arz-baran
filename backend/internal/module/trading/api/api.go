// Package api is the cross-module facade for trading operations.
// Other modules depend on this package only — never on trading/service or trading/store.
package api

import (
	"context"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// PlaceOrderCommand carries the input required to place an order.
type PlaceOrderCommand struct {
	UserID         kernel.ID
	Pair           kernel.PairID
	Side           string // "buy" or "sell"
	Type           string // "limit" or "market"
	Price          string // decimal string; empty for market orders
	Quantity       string // decimal string
	IdempotencyKey string
}

// API is the trading module boundary exposed to other bounded contexts.
type API interface {
	// PlaceOrder validates and creates a new Order, returning its ID.
	PlaceOrder(ctx context.Context, cmd PlaceOrderCommand) (kernel.ID, error)
	// CancelOrder cancels an open Order belonging to userID.
	CancelOrder(ctx context.Context, orderID kernel.ID, userID kernel.ID) error
}
