package logger

import "context"

type contextKey int

const (
	keyRequestID contextKey = iota + 1
	keyCorrelationID
	keyLogger
)

// WithRequestID stores the request ID on the context.
func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, keyRequestID, requestID)
}

// RequestIDFromContext returns the request ID when present.
func RequestIDFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(keyRequestID).(string)
	return v, ok && v != ""
}

// WithCorrelationID stores the correlation ID on the context.
func WithCorrelationID(ctx context.Context, correlationID string) context.Context {
	return context.WithValue(ctx, keyCorrelationID, correlationID)
}

// CorrelationIDFromContext returns the correlation ID when present.
func CorrelationIDFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(keyCorrelationID).(string)
	return v, ok && v != ""
}

// WithLogger stores a request-scoped logger on the context.
func WithLogger(ctx context.Context, log ApplicationLogger) context.Context {
	return context.WithValue(ctx, keyLogger, log)
}

// FromContext returns the request-scoped logger or nil.
func FromContext(ctx context.Context) ApplicationLogger {
	v, _ := ctx.Value(keyLogger).(ApplicationLogger)
	return v
}
