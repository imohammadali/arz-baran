package http

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"backend/internal/platform/config"
	"backend/internal/ports"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

type Dependencies struct {
	Config config.Config
	Logger *slog.Logger
	DB     ports.Pinger
	Redis  ports.Pinger
}

type Server struct {
	echo            *echo.Echo
	logger          *slog.Logger
	addr            string
	shutdownTimeout time.Duration
}

func NewServer(deps Dependencies) *Server {
	e := echo.New()

	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())
	e.Use(requestLogger(deps.Logger))

	health := NewHealthHandler(deps.Config.AppName, deps.DB, deps.Redis)
	e.GET("/health/live", health.Live)
	e.GET("/health/ready", health.Ready)

	return &Server{
		echo:            e,
		logger:          deps.Logger,
		addr:            deps.Config.HTTPAddr(),
		shutdownTimeout: deps.Config.ShutdownTimeout,
	}
}

func (s *Server) Run(ctx context.Context) error {
	sc := echo.StartConfig{
		Address:         s.addr,
		HideBanner:      true,
		GracefulTimeout: s.shutdownTimeout,
		OnShutdownError: func(err error) {
			s.logger.Error("graceful shutdown failed", "error", err)
		},
	}

	s.logger.Info("starting http server", "addr", s.addr)
	if err := sc.Start(ctx, s.echo); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("http server: %w", err)
	}

	s.logger.Info("http server stopped")
	return nil
}

func requestLogger(logger *slog.Logger) echo.MiddlewareFunc {
	return middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
		LogStatus:   true,
		LogURI:      true,
		LogMethod:   true,
		LogRemoteIP: true,
		LogLatency:  true,
		HandleError: true,
		LogValuesFunc: func(_ *echo.Context, v middleware.RequestLoggerValues) error {
			attrs := []any{
				"method", v.Method,
				"uri", v.URI,
				"status", v.Status,
				"latency", v.Latency.String(),
				"remote_ip", v.RemoteIP,
			}
			if v.Error != nil {
				attrs = append(attrs, "error", v.Error.Error())
				logger.Error("request failed", attrs...)
				return nil
			}
			logger.Info("request completed", attrs...)
			return nil
		},
	})
}
