// Package httpx provides Echo HTTP server wiring, middleware, and error mapping.
package httpx

import (
	"context"
	"fmt"
	"net/http"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	"github.com/imohammadali/arz-baran/backend/internal/platform/config"
	"github.com/imohammadali/arz-baran/backend/internal/platform/logger"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// Server wraps Echo with platform middleware and health routes.
type Server struct {
	echo *echo.Echo
	cfg  config.Server
}

// Dependencies required to construct the HTTP server.
type Dependencies struct {
	Config       config.Server
	AppLogger    logger.ApplicationLogger
	LiveChecker  HealthChecker
	ReadyChecker HealthChecker
	ErrorMapper  ErrorMapper
}

// HealthChecker verifies a dependency for health endpoints.
type HealthChecker interface {
	Check(ctx context.Context) error
}

// NewServer constructs a configured Echo instance.
func NewServer(deps Dependencies) *Server {
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	e.Use(middleware.Recover())
	if deps.AppLogger != nil {
		e.Use(logger.Middleware(logger.MiddlewareConfig{
			Logger:    deps.AppLogger,
			SkipPaths: logger.SkipHealthPaths(),
		}))
	}

	if deps.ErrorMapper != nil {
		e.HTTPErrorHandler = deps.ErrorMapper.HTTPErrorHandler
	}

	s := &Server{echo: e, cfg: deps.Config}

	s.registerHealth(deps.LiveChecker, deps.ReadyChecker)
	return s
}

// Echo exposes the underlying Echo instance for route registration.
func (s *Server) Echo() *echo.Echo {
	return s.echo
}

// Start begins serving HTTP traffic.
func (s *Server) Start() error {
	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
	return s.echo.Start(addr)
}

// Shutdown gracefully stops the server.
func (s *Server) Shutdown(ctx context.Context) error {
	return s.echo.Shutdown(ctx)
}

func (s *Server) registerHealth(live, ready HealthChecker) {
	s.echo.GET("/health/live", func(c echo.Context) error {
		if live != nil {
			if err := live.Check(c.Request().Context()); err != nil {
				return c.JSON(http.StatusServiceUnavailable, map[string]string{"status": "unhealthy"})
			}
		}
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	s.echo.GET("/health/ready", func(c echo.Context) error {
		if ready != nil {
			if err := ready.Check(c.Request().Context()); err != nil {
				return c.JSON(http.StatusServiceUnavailable, map[string]string{"status": "not_ready"})
			}
		}
		return c.JSON(http.StatusOK, map[string]string{"status": "ready"})
	})
}

// StaticHealthChecker always reports healthy.
type StaticHealthChecker struct{}

func (StaticHealthChecker) Check(_ context.Context) error { return nil }

// APIError is the client-facing error envelope.
type APIError struct {
	Code          kernel.Code `json:"code"`
	Message       string      `json:"message"`
	RequestID     string      `json:"request_id"`
	CorrelationID string      `json:"correlation_id,omitempty"`
	Details       []FieldError `json:"details,omitempty"`
}

// FieldError describes a validation failure for a single field.
type FieldError struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ErrorResponse wraps APIError for JSON responses.
type ErrorResponse struct {
	Error APIError `json:"error"`
}
