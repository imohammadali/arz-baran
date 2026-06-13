package domain

import (
	"time"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// DomainEvent is the base contract for all trading domain events.
type DomainEvent interface {
	EventType() string
	OccurredAt() time.Time
	AggregateID() kernel.ID
}

type baseEvent struct {
	aggregateID kernel.ID
	occurredAt  time.Time
}

func (e baseEvent) OccurredAt() time.Time  { return e.occurredAt }
func (e baseEvent) AggregateID() kernel.ID { return e.aggregateID }

// OrderPlacedEvent is emitted when a new Order is created in Pending state.
type OrderPlacedEvent struct{ baseEvent }

func (e OrderPlacedEvent) EventType() string { return "trading.order_placed" }

// OrderOpenedEvent is emitted when an Order transitions from Pending to Open.
type OrderOpenedEvent struct{ baseEvent }

func (e OrderOpenedEvent) EventType() string { return "trading.order_opened" }

// OrderPartiallyFilledEvent is emitted on each partial fill.
type OrderPartiallyFilledEvent struct {
	baseEvent
	FilledQty string
}

func (e OrderPartiallyFilledEvent) EventType() string { return "trading.order_partially_filled" }

// OrderFilledEvent is emitted when an Order is fully filled.
type OrderFilledEvent struct{ baseEvent }

func (e OrderFilledEvent) EventType() string { return "trading.order_filled" }

// OrderCancelledEvent is emitted when an Order is cancelled.
type OrderCancelledEvent struct{ baseEvent }

func (e OrderCancelledEvent) EventType() string { return "trading.order_cancelled" }

// TradeExecutedEvent is emitted when a Trade is created.
type TradeExecutedEvent struct {
	baseEvent
	TradeID kernel.ID
}

func (e TradeExecutedEvent) EventType() string { return "trading.trade_executed" }
