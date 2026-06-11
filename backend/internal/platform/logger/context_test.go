package logger

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"testing"
)

func TestContextPropagation_InLogRecord(t *testing.T) {
	var buf bytes.Buffer
	inner := slog.NewJSONHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug})
	base := slog.New(newEnrichHandler(inner))

	ctx := WithRequestID(context.Background(), "req-1")
	ctx = WithCorrelationID(ctx, "corr-1")

	base.InfoContext(ctx, "test message")

	var record map[string]any
	if err := json.Unmarshal(buf.Bytes(), &record); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if record["request_id"] != "req-1" {
		t.Fatalf("request_id: got %v", record["request_id"])
	}
	if record["correlation_id"] != "corr-1" {
		t.Fatalf("correlation_id: got %v", record["correlation_id"])
	}
	if record["msg"] != "test message" {
		t.Fatalf("msg: got %v", record["msg"])
	}
}

func TestFromContext(t *testing.T) {
	root := NewApplicationLogger(Options{Level: "info", Format: "json", ServiceName: "test"})
	ctx := WithLogger(context.Background(), root.With("scope", "unit"))

	got := FromContext(ctx)
	if got == nil {
		t.Fatal("expected logger from context")
	}
}
