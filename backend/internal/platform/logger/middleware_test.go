package logger

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

type captureLogger struct {
	lastMsg  string
	lastArgs []any
}

func (c *captureLogger) Debug(_ context.Context, msg string, args ...any) { c.store(msg, args) }
func (c *captureLogger) Info(_ context.Context, msg string, args ...any)  { c.store(msg, args) }
func (c *captureLogger) Warn(_ context.Context, msg string, args ...any)  { c.store(msg, args) }
func (c *captureLogger) Error(_ context.Context, msg string, args ...any) { c.store(msg, args) }
func (c *captureLogger) With(_ ...any) ApplicationLogger                   { return c }

func (c *captureLogger) store(msg string, args []any) {
	c.lastMsg = msg
	c.lastArgs = args
}

func TestMiddleware_SetsIDsAndContext(t *testing.T) {
	e := echo.New()
	capLog := &captureLogger{}

	e.Use(Middleware(MiddlewareConfig{Logger: capLog}))
	e.GET("/v1/test", func(c echo.Context) error {
		rid, ok := RequestIDFromContext(c.Request().Context())
		if !ok || rid == "" {
			t.Fatal("missing request_id in context")
		}
		cid, ok := CorrelationIDFromContext(c.Request().Context())
		if !ok || cid != "client-corr" {
			t.Fatalf("correlation_id: got %q", cid)
		}
		if FromContext(c.Request().Context()) == nil {
			t.Fatal("missing logger in context")
		}
		return c.NoContent(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	req.Header.Set(HeaderCorrelationID, "client-corr")
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if got := rec.Header().Get(HeaderRequestID); got == "" {
		t.Fatal("response missing X-Request-ID")
	}
	if got := rec.Header().Get(HeaderCorrelationID); got != "client-corr" {
		t.Fatalf("response correlation_id: got %q", got)
	}
	if capLog.lastMsg != "http request completed" {
		t.Fatalf("access log msg: got %q", capLog.lastMsg)
	}
}

func TestMiddleware_SkipsHealthAccessLog(t *testing.T) {
	e := echo.New()
	capLog := &captureLogger{}

	e.Use(Middleware(MiddlewareConfig{
		Logger:    capLog,
		SkipPaths: SkipHealthPaths(),
	}))
	e.GET("/health/live", func(c echo.Context) error {
		return c.NoContent(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/health/live", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if capLog.lastMsg != "" {
		t.Fatalf("expected no access log, got %q", capLog.lastMsg)
	}
}
