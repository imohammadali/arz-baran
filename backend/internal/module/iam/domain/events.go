package domain

import (
	"time"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// DomainEvent is the base contract for all IAM domain events.
type DomainEvent interface {
	EventType() string
	OccurredAt() time.Time
	AggregateID() kernel.ID
}

// baseEvent carries the common fields shared by all IAM domain events.
type baseEvent struct {
	aggregateID kernel.ID
	occurredAt  time.Time
}

func (e baseEvent) OccurredAt() time.Time   { return e.occurredAt }
func (e baseEvent) AggregateID() kernel.ID  { return e.aggregateID }

// UserRegisteredEvent is emitted when a new User is created.
type UserRegisteredEvent struct {
	baseEvent
}

func (e UserRegisteredEvent) EventType() string { return "user.registered" }

// UserSuspendedEvent is emitted when a User transitions to Suspended.
type UserSuspendedEvent struct {
	baseEvent
}

func (e UserSuspendedEvent) EventType() string { return "user.suspended" }

// UserActivatedEvent is emitted when a User transitions to Active.
type UserActivatedEvent struct {
	baseEvent
}

func (e UserActivatedEvent) EventType() string { return "user.activated" }
