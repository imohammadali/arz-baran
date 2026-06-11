// Package logger provides structured logging interfaces and HTTP request context propagation.
package logger

import (
	"context"
	"log/slog"
	"os"
)

// Class identifies the log stream.
type Class string

const (
	ClassApplication Class = "app"
	ClassSecurity    Class = "security"
	ClassAudit       Class = "audit"
)

// ApplicationLogger emits level-gated operational logs.
type ApplicationLogger interface {
	Debug(ctx context.Context, msg string, args ...any)
	Info(ctx context.Context, msg string, args ...any)
	Warn(ctx context.Context, msg string, args ...any)
	Error(ctx context.Context, msg string, args ...any)
	With(args ...any) ApplicationLogger
}

// SecurityLogger emits security events; not gated by LOG_LEVEL.
type SecurityLogger interface {
	Event(ctx context.Context, eventType string, severity string, args ...any)
}

// AuditRecorder persists immutable audit records.
type AuditRecorder interface {
	Record(ctx context.Context, entry AuditEntry) error
}

// AuditEntry is the audit log payload (persisted to PostgreSQL at implementation time).
type AuditEntry struct {
	CorrelationID string
	RequestID     string
	ActorType     string
	ActorID       string
	Action        string
	ResourceType  string
	ResourceID    string
}

// Options configures the process-scoped application logger.
type Options struct {
	Level       string
	Format      string
	ServiceName string
	Env         string
	Version     string
}

// NewApplicationLogger creates the process-scoped structured application logger.
func NewApplicationLogger(opts Options) ApplicationLogger {
	level := parseLevel(opts.Level)

	var inner slog.Handler
	handlerOpts := &slog.HandlerOptions{Level: level, AddSource: opts.Env == "development"}
	switch opts.Format {
	case "text":
		inner = slog.NewTextHandler(os.Stdout, handlerOpts)
	default:
		inner = slog.NewJSONHandler(os.Stdout, handlerOpts)
	}

	base := slog.New(newEnrichHandler(inner)).With(
		slog.String("log_class", string(ClassApplication)),
		slog.String("service", opts.ServiceName),
		slog.String("env", opts.Env),
		slog.String("version", opts.Version),
	)

	return &slogApplicationLogger{base: base}
}

type slogApplicationLogger struct {
	base *slog.Logger
}

func (l *slogApplicationLogger) Debug(ctx context.Context, msg string, args ...any) {
	l.base.DebugContext(ctx, msg, args...)
}

func (l *slogApplicationLogger) Info(ctx context.Context, msg string, args ...any) {
	l.base.InfoContext(ctx, msg, args...)
}

func (l *slogApplicationLogger) Warn(ctx context.Context, msg string, args ...any) {
	l.base.WarnContext(ctx, msg, args...)
}

func (l *slogApplicationLogger) Error(ctx context.Context, msg string, args ...any) {
	l.base.ErrorContext(ctx, msg, args...)
}

func (l *slogApplicationLogger) With(args ...any) ApplicationLogger {
	return &slogApplicationLogger{base: l.base.With(args...)}
}
