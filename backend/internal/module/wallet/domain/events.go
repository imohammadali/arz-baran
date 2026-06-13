package domain

import (
	"time"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// DomainEvent is the base contract for all wallet domain events.
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

// BalanceHeldEvent is emitted when a new Hold is created on an Account.
type BalanceHeldEvent struct {
	baseEvent
	HoldID    kernel.ID
	AccountID kernel.ID
}

func (e BalanceHeldEvent) EventType() string { return "wallet.balance_held" }

// HoldReleasedEvent is emitted when a Hold transitions to Released.
type HoldReleasedEvent struct {
	baseEvent
	HoldID    kernel.ID
	AccountID kernel.ID
}

func (e HoldReleasedEvent) EventType() string { return "wallet.hold_released" }

// HoldSettledEvent is emitted when a Hold transitions to Settled.
type HoldSettledEvent struct {
	baseEvent
	HoldID    kernel.ID
	AccountID kernel.ID
}

func (e HoldSettledEvent) EventType() string { return "wallet.hold_settled" }

// TransactionCompletedEvent is emitted when a Transaction transitions to Completed.
type TransactionCompletedEvent struct {
	baseEvent
	TransactionID kernel.ID
}

func (e TransactionCompletedEvent) EventType() string { return "wallet.transaction_completed" }
