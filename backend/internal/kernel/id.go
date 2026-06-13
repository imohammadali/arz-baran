package kernel

import "github.com/google/uuid"

// ID is a domain identifier (UUIDv7 preferred at creation sites).
type ID = uuid.UUID

// NewID generates a UUIDv7 (time-ordered). Falls back to UUIDv4 on the rare
// clock error so callers never receive a zero value.
func NewID() ID {
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.New()
	}
	return id
}
