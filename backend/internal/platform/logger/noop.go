package logger

import "context"

// NoopSecurityLogger discards security events until the security pipeline is implemented.
type NoopSecurityLogger struct{}

func (NoopSecurityLogger) Event(_ context.Context, _ string, _ string, _ ...any) {}

// NoopAuditRecorder discards audit entries until the audit store is implemented.
type NoopAuditRecorder struct{}

func (NoopAuditRecorder) Record(_ context.Context, _ AuditEntry) error { return nil }
