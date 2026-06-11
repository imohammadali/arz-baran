package logger

import (
	"strings"
	"unicode"

	"github.com/google/uuid"
)

const maxIDLength = 128

// Header names for request and correlation identifiers.
const (
	HeaderRequestID     = "X-Request-ID"
	HeaderCorrelationID = "X-Correlation-ID"
)

// NewRequestID generates a new request identifier.
func NewRequestID() string {
	return uuid.NewString()
}

// NormalizeRequestID accepts a client-provided request ID or generates a new one.
func NormalizeRequestID(clientID string) string {
	if validID(clientID) {
		return strings.TrimSpace(clientID)
	}
	return NewRequestID()
}

// NormalizeCorrelationID accepts a client-provided correlation ID or falls back.
func NormalizeCorrelationID(clientID, fallback string) string {
	if validID(clientID) {
		return strings.TrimSpace(clientID)
	}
	if validID(fallback) {
		return strings.TrimSpace(fallback)
	}
	return NewRequestID()
}

func validID(id string) bool {
	id = strings.TrimSpace(id)
	if id == "" || len(id) > maxIDLength {
		return false
	}
	for _, r := range id {
		if r == '-' || r == '_' || r == '.' {
			continue
		}
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			continue
		}
		return false
	}
	return true
}
