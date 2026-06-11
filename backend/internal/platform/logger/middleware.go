package logger

import (
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

// MiddlewareConfig configures HTTP logging middleware.
type MiddlewareConfig struct {
	Logger    ApplicationLogger
	SkipPaths []string
}

// Middleware returns Echo middleware that assigns request/correlation IDs,
// injects a request-scoped logger, and emits structured access logs.
func Middleware(cfg MiddlewareConfig) echo.MiddlewareFunc {
	skip := make(map[string]struct{}, len(cfg.SkipPaths))
	for _, p := range cfg.SkipPaths {
		skip[p] = struct{}{}
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()

			requestID := NormalizeRequestID(
				c.Request().Header.Get(HeaderRequestID),
			)
			correlationID := NormalizeCorrelationID(
				c.Request().Header.Get(HeaderCorrelationID),
				requestID,
			)

			c.Response().Header().Set(HeaderRequestID, requestID)
			c.Response().Header().Set(HeaderCorrelationID, correlationID)

			ctx := WithRequestID(c.Request().Context(), requestID)
			ctx = WithCorrelationID(ctx, correlationID)

			ctx = WithLogger(ctx, cfg.Logger)
			c.SetRequest(c.Request().WithContext(ctx))

			err := next(c)

			path := c.Request().URL.Path
			if _, ok := skip[path]; ok {
				return err
			}

			status := c.Response().Status
			if err != nil {
				if he, ok := err.(*echo.HTTPError); ok {
					status = he.Code
				} else if status == 0 {
					status = 500
				}
			}

			route := c.Path()
			if route == "" {
				route = path
			}

			reqLogger := FromContext(ctx)
			if reqLogger == nil {
				reqLogger = cfg.Logger
			}

			attrs := []any{
				"http.method", c.Request().Method,
				"http.route", route,
				"http.status", status,
				"http.client_ip", c.RealIP(),
				"duration_ms", time.Since(start).Milliseconds(),
				"outcome", requestOutcome(status, err),
			}
			if err != nil {
				attrs = append(attrs, "error", err.Error())
			}

			switch {
			case status >= 500:
				reqLogger.Error(ctx, "http request completed", attrs...)
			case status >= 400:
				reqLogger.Warn(ctx, "http request completed", attrs...)
			default:
				reqLogger.Info(ctx, "http request completed", attrs...)
			}

			return err
		}
	}
}

func requestOutcome(status int, err error) string {
	if err != nil && status >= 500 {
		return "failure"
	}
	if status >= 400 {
		return "failure"
	}
	return "success"
}

// SkipHealthPaths returns paths excluded from info-level access logs.
func SkipHealthPaths() []string {
	return []string{"/health/live", "/health/ready"}
}

// IsHealthPath reports whether the path is a health probe endpoint.
func IsHealthPath(path string) bool {
	return strings.HasPrefix(path, "/health/")
}
