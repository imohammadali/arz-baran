package logger

import (
	"context"
	"log/slog"
)

// enrichHandler injects base and request-scoped fields into every log record.
type enrichHandler struct {
	inner slog.Handler
}

func newEnrichHandler(inner slog.Handler) *enrichHandler {
	return &enrichHandler{inner: inner}
}

func (h *enrichHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.inner.Enabled(ctx, level)
}

func (h *enrichHandler) Handle(ctx context.Context, r slog.Record) error {
	if id, ok := RequestIDFromContext(ctx); ok {
		r.AddAttrs(slog.String("request_id", id))
	}
	if id, ok := CorrelationIDFromContext(ctx); ok {
		r.AddAttrs(slog.String("correlation_id", id))
	}
	return h.inner.Handle(ctx, r)
}

func (h *enrichHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &enrichHandler{inner: h.inner.WithAttrs(attrs)}
}

func (h *enrichHandler) WithGroup(name string) slog.Handler {
	return &enrichHandler{inner: h.inner.WithGroup(name)}
}

func parseLevel(level string) slog.Level {
	switch level {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
