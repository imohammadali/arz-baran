package kernel

import "github.com/google/uuid"

// ID is a domain identifier (UUIDv7 preferred at creation sites).
type ID = uuid.UUID

// NewID generates a random UUID. Replace with UUIDv7 when the id package is implemented.
func NewID() ID {
	return uuid.New()
}
