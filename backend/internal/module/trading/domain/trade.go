package domain

import (
	"fmt"
	"time"

	"github.com/shopspring/decimal"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// Trade is an immutable value object recording the execution of a match between
// a maker and a taker Order. Price and Quantity are ALWAYS positive.
type Trade struct {
	ID           kernel.ID
	MakerOrderID kernel.ID
	TakerOrderID kernel.ID
	Pair         kernel.PairID
	Price        decimal.Decimal
	Quantity     decimal.Decimal
	MakerSide    Side
	CreatedAt    time.Time
}

// NewTrade constructs and validates a Trade.
// Price and Quantity must both be > 0.
func NewTrade(
	id kernel.ID,
	makerOrderID kernel.ID,
	takerOrderID kernel.ID,
	pair kernel.PairID,
	price decimal.Decimal,
	quantity decimal.Decimal,
	makerSide Side,
	now time.Time,
) (*Trade, error) {
	if !price.IsPositive() {
		return nil, ErrInvalidOrderPrice(fmt.Sprintf("trade price must be > 0, got %s", price))
	}
	if !quantity.IsPositive() {
		return nil, ErrInvalidOrderQty(fmt.Sprintf("trade quantity must be > 0, got %s", quantity))
	}
	return &Trade{
		ID:           id,
		MakerOrderID: makerOrderID,
		TakerOrderID: takerOrderID,
		Pair:         pair,
		Price:        price,
		Quantity:     quantity,
		MakerSide:    makerSide,
		CreatedAt:    now,
	}, nil
}
