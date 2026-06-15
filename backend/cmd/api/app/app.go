// Package app is the composition root for the API binary.
package app

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	echoSwagger "github.com/swaggo/echo-swagger"

	adminhandler "github.com/imohammadali/arz-baran/backend/internal/admin/handler"
	_ "github.com/imohammadali/arz-baran/backend/docs" // generated Swagger spec
	"github.com/imohammadali/arz-baran/backend/internal/module/iam"
	"github.com/imohammadali/arz-baran/backend/internal/module/instrument"
	"github.com/imohammadali/arz-baran/backend/internal/module/trading"
	"github.com/imohammadali/arz-baran/backend/internal/module/wallet"
	"github.com/imohammadali/arz-baran/backend/internal/platform/config"
	"github.com/imohammadali/arz-baran/backend/internal/platform/httpx"
	"github.com/imohammadali/arz-baran/backend/internal/platform/logger"
	platformmodule "github.com/imohammadali/arz-baran/backend/internal/platform/module"
	"github.com/imohammadali/arz-baran/backend/internal/platform/migrate"
	"github.com/imohammadali/arz-baran/backend/internal/platform/postgres"
	"github.com/imohammadali/arz-baran/backend/internal/platform/redis"
)

// App holds the running API process and its dependencies.
type App struct {
	cfg      config.Config
	log      logger.ApplicationLogger
	pg       *postgres.Pool
	redis    *redis.Client
	http     *httpx.Server
	modules  []platformmodule.Module
}

// New builds the application graph: platform → modules → HTTP routes.
func New(ctx context.Context) (*App, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("app: load config: %w", err)
	}

	log := logger.NewApplicationLogger(logger.Options{
		Level:       cfg.Logging.Level,
		Format:      cfg.Logging.Format,
		ServiceName: cfg.Meta.ServiceName,
		Env:         string(cfg.Meta.Env),
		Version:     cfg.Meta.Version,
	})
	log.Info(ctx, "configuration loaded", "summary", cfg.SafeSummary())

	if err := migrate.Run(ctx, cfg.Postgres, migrate.DefaultDir); err != nil {
		return nil, fmt.Errorf("app: migrate: %w", err)
	}

	pg, err := postgres.NewPool(ctx, cfg.Postgres)
	if err != nil {
		return nil, fmt.Errorf("app: postgres: %w", err)
	}

	rd, err := redis.NewClient(ctx, cfg.Redis)
	if err != nil {
		pg.Close()
		return nil, fmt.Errorf("app: redis: %w", err)
	}

	iamMod := iam.New(iam.Dependencies{Logger: log})
	instrumentMod := instrument.New(instrument.Dependencies{Logger: log, Pool: pg.Pool})
	walletMod := wallet.New(wallet.Dependencies{Logger: log})
	tradingMod := trading.New(trading.Dependencies{Logger: log})

	iamAPI := iamMod.API()
	instrumentAPI := instrumentMod.API()
	walletAPI := walletMod.API()
	tradingAPI := tradingMod.API()
	_ = iamAPI        // wired into wallet in Phase 1
	_ = instrumentAPI // wired into trading in Phase 3
	_ = walletAPI     // wired into trading in Phase 3
	_ = tradingAPI    // wired into matching engine in Phase 3

	modules := []platformmodule.Module{iamMod, instrumentMod, walletMod, tradingMod}

	mapper := httpx.NewErrorMapper(httpx.DefaultRegistry)
	httpServer := httpx.NewServer(httpx.Dependencies{
		Config:       cfg.Server,
		AppLogger:    log,
		LiveChecker:  httpx.StaticHealthChecker{},
		ReadyChecker: &readyChecker{pg: pg, redis: rd},
		ErrorMapper:  mapper,
	})

	registerRoutes(httpServer, modules, cfg)

	return &App{
		cfg:     cfg,
		log:     log,
		pg:      pg,
		redis:   rd,
		http:    httpServer,
		modules: modules,
	}, nil
}

func registerRoutes(httpServer *httpx.Server, modules []platformmodule.Module, cfg config.Config) {
	e := httpServer.Echo()
	v1 := e.Group("/v1")

	for _, mod := range modules {
		mod.RegisterHTTP(v1.Group("/" + mod.Name()))
	}

	adminhandler.New().Register(v1.Group("/admin"))

	// Swagger UI is available in non-production environments only.
	if cfg.Meta.Env != config.EnvProduction {
		e.GET("/swagger/*", echoSwagger.WrapHandler)
	}
}

// Run starts the HTTP server and blocks until shutdown.
func (a *App) Run(ctx context.Context) error {
	errCh := make(chan error, 1)
	go func() {
		a.log.Info(ctx, "server starting", "addr", fmt.Sprintf("%s:%d", a.cfg.Server.Host, a.cfg.Server.Port))
		if err := a.http.Start(); err != nil {
			errCh <- err
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return err
	case sig := <-sigCh:
		a.log.Info(ctx, "shutdown signal received", "signal", sig.String())
	}

	shutdownCtx, cancel := context.WithTimeout(ctx, a.cfg.Server.ShutdownTimeout)
	defer cancel()

	if err := a.http.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("app: http shutdown: %w", err)
	}

	for i := len(a.modules) - 1; i >= 0; i-- {
		if err := a.modules[i].Close(shutdownCtx); err != nil {
			return fmt.Errorf("app: module %s close: %w", a.modules[i].Name(), err)
		}
	}

	a.redis.Close()
	a.pg.Close()

	a.log.Info(ctx, "shutdown complete")
	return nil
}

type readyChecker struct {
	pg    postgres.Pinger
	redis redis.Pinger
}

func (r *readyChecker) Check(ctx context.Context) error {
	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if err := r.pg.Ping(pingCtx); err != nil {
		return err
	}
	if err := r.redis.Ping(pingCtx); err != nil {
		return err
	}
	return nil
}
