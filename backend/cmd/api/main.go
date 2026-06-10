package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	adapterpostgres "backend/internal/adapters/postgres"
	adapterredis "backend/internal/adapters/redis"
	apihttp "backend/internal/api/http"
	"backend/internal/platform/config"
	"backend/internal/platform/logger"
	"backend/internal/platform/migrate"
	"backend/internal/platform/postgres"
	"backend/internal/platform/redis"
)

func main() {
	if err := run(); err != nil {
		slog.Error("application stopped with error", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	log := logger.New(cfg)
	log.Info("booting application",
		"app", cfg.AppName,
		"addr", cfg.HTTPAddr(),
	)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if cfg.AutoMigrate {
		log.Info("running database migrations", "dir", cfg.MigrationsDir)
		if err := migrate.Up(ctx, cfg.DatabaseURL, cfg.MigrationsDir); err != nil {
			return fmt.Errorf("run migrations: %w", err)
		}
	}

	db, err := postgres.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	defer db.Close()

	cache, err := redis.Connect(ctx, cfg.RedisURL)
	if err != nil {
		return fmt.Errorf("connect redis: %w", err)
	}
	defer func() {
		if err := cache.Close(); err != nil {
			log.Error("close redis", "error", err)
		}
	}()

	server := apihttp.NewServer(apihttp.Dependencies{
		Config: cfg,
		Logger: log,
		DB:     adapterpostgres.NewHealthChecker(db),
		Redis:  adapterredis.NewHealthChecker(cache),
	})

	return server.Run(ctx)
}
