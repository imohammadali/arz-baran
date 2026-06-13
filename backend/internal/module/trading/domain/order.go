package domain

import (
	"fmt"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// Side indicates the direction of an Order.
type Side string

const (
	SideBuy  Side = "buy"
	SideSell Side = "sell"
)

// OrderType distinguishes price-constrained from price-agnostic orders.
type OrderType string

const (
	OrderTypeLimit  OrderType = "limit"
	OrderTypeMarket OrderType = "market"
)

// OrderStatus represents the lifecycle state of an Order.
type OrderStatus string

const (
	OrderStatusPending         OrderStatus = "pending"
	OrderStatusOpen            OrderStatus = "open"
	OrderStatusPartiallyFilled OrderStatus = "partially_filled"
	OrderStatusFilled          OrderStatus = "filled"
	OrderStatusCancelled       OrderStatus = "cancelled"
)

// Order is the trading aggregate root representing a user's instruction to buy
// or sell on a trading pair. It does not move money — it coordinates Holds.
type Order struct {
	ID             kernel.ID
	UserID         kernel.ID
	Pair           kernel.PairID
	Side           Side
	Type           OrderType
	Status         OrderStatus
	Price          *decimal.Decimal // nil for market orders
	Quantity       decimal.Decimal
	FilledQty      decimal.Decimal
	RemainingQty   decimal.Decimal
	IdempotencyKey string
	CreatedAt      time.Time
	UpdatedAt      time.Time

	events []DomainEvent
}

// NewLimitOrder constructs a limit Order in Pending state.
// price and qty must be > 0; idempotencyKey must be non-empty.
func NewLimitOrder(
	id kernel.ID,
	userID kernel.ID,
	pair kernel.PairID,
	side Side,
	price decimal.Decimal,
	qty decimal.Decimal,
	idempotencyKey string,
	now time.Time,
) (*Order, error) {
	if !price.IsPositive() {
		return nil, ErrInvalidOrderPrice(fmt.Sprintf("limit price must be > 0, got %s", price))
	}
	if err := validateQtyAndKey(qty, idempotencyKey); err != nil {
		return nil, err
	}
	p := price
	o := &Order{
		ID:             id,
		UserID:         userID,
		Pair:           pair,
		Side:           side,
		Type:           OrderTypeLimit,
		Status:         OrderStatusPending,
		Price:          &p,
		Quantity:       qty,
		FilledQty:      decimal.Zero,
		RemainingQty:   qty,
		IdempotencyKey: idempotencyKey,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	o.record(OrderPlacedEvent{baseEvent{aggregateID: id, occurredAt: now}})
	return o, nil
}

// NewMarketOrder constructs a market Order in Pending state.
// qty must be > 0; idempotencyKey must be non-empty.
func NewMarketOrder(
	id kernel.ID,
	userID kernel.ID,
	pair kernel.PairID,
	side Side,
	qty decimal.Decimal,
	idempotencyKey string,
	now time.Time,
) (*Order, error) {
	if err := validateQtyAndKey(qty, idempotencyKey); err != nil {
		return nil, err
	}
	o := &Order{
		ID:             id,
		UserID:         userID,
		Pair:           pair,
		Side:           side,
		Type:           OrderTypeMarket,
		Status:         OrderStatusPending,
		Price:          nil,
		Quantity:       qty,
		FilledQty:      decimal.Zero,
		RemainingQty:   qty,
		IdempotencyKey: idempotencyKey,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	o.record(OrderPlacedEvent{baseEvent{aggregateID: id, occurredAt: now}})
	return o, nil
}

// Open transitions the Order from Pending to Open (accepted by the matching engine).
func (o *Order) Open(now time.Time) error {
	if o.Status != OrderStatusPending {
		return kernel.NewDomainError(
			kernel.ModuleSystem,
			CodeOrderNotOpen,
			fmt.Sprintf("cannot open order: current status is %s", o.Status),
		)
	}
	o.Status = OrderStatusOpen
	o.UpdatedAt = now
	o.record(OrderOpenedEvent{baseEvent{aggregateID: o.ID, occurredAt: now}})
	return nil
}

// Fill records a partial or full execution. qty must be > 0 and ≤ RemainingQty.
// Order must be Open or PartiallyFilled.
func (o *Order) Fill(qty decimal.Decimal, now time.Time) error {
	if o.Status != OrderStatusOpen && o.Status != OrderStatusPartiallyFilled {
		return ErrOrderNotOpen()
	}
	if !qty.IsPositive() {
		return ErrInvalidOrderQty(fmt.Sprintf("fill qty must be > 0, got %s", qty))
	}
	if qty.GreaterThan(o.RemainingQty) {
		return ErrInvalidOrderQty(
			fmt.Sprintf("fill qty %s exceeds remaining qty %s", qty, o.RemainingQty),
		)
	}

	o.FilledQty = o.FilledQty.Add(qty)
	o.RemainingQty = o.RemainingQty.Sub(qty)
	o.UpdatedAt = now

	if o.RemainingQty.IsZero() {
		o.Status = OrderStatusFilled
		o.record(OrderFilledEvent{baseEvent{aggregateID: o.ID, occurredAt: now}})
	} else {
		o.Status = OrderStatusPartiallyFilled
		o.record(OrderPartiallyFilledEvent{
			baseEvent: baseEvent{aggregateID: o.ID, occurredAt: now},
			FilledQty: qty.String(),
		})
	}
	return nil
}

// Cancel cancels the order. Fails if already Filled or Cancelled.
func (o *Order) Cancel(now time.Time) error {
	if o.Status == OrderStatusFilled {
		return ErrOrderAlreadyFilled()
	}
	if o.Status == OrderStatusCancelled {
		return kernel.NewDomainError(
			kernel.ModuleSystem,
			CodeOrderNotOpen,
			"order is already cancelled",
		)
	}
	o.Status = OrderStatusCancelled
	o.UpdatedAt = now
	o.record(OrderCancelledEvent{baseEvent{aggregateID: o.ID, occurredAt: now}})
	return nil
}

// Events returns uncommitted domain events.
func (o *Order) Events() []DomainEvent { return o.events }

// ClearEvents discards accumulated domain events after dispatch.
func (o *Order) ClearEvents() { o.events = nil }

func (o *Order) record(e DomainEvent) { o.events = append(o.events, e) }

func validateQtyAndKey(qty decimal.Decimal, idempotencyKey string) error {
	if !qty.IsPositive() {
		return ErrInvalidOrderQty(fmt.Sprintf("quantity must be > 0, got %s", qty))
	}
	if strings.TrimSpace(idempotencyKey) == "" {
		return ErrInvalidOrderQty("idempotency key must not be empty")
	}
	return nil
}
