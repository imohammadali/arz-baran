package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/imohammadali/arz-baran/backend/internal/platform/config"
	"github.com/imohammadali/arz-baran/backend/internal/platform/migrate"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config: %v\n", err)
		os.Exit(1)
	}

	dir := envOr("MIGRATIONS_DIR", migrate.DefaultDir)

	var runErr error
	switch os.Args[1] {
	case "up":
		runErr = migrate.Up(ctx, cfg.Postgres, dir)
	case "down":
		runErr = migrate.Down(ctx, cfg.Postgres, dir)
	case "status":
		runErr = migrate.Status(ctx, cfg.Postgres, dir)
	case "version":
		runErr = migrate.PrintVersion(ctx, cfg.Postgres, dir)
	default:
		usage()
		os.Exit(2)
	}

	if runErr != nil {
		fmt.Fprintf(os.Stderr, "migrate: %v\n", runErr)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, `Usage: migrate <command>

Commands:
  up       Apply pending migrations
  down     Roll back one migration (development only)
  status   Print migration status
  version  Print current migration version

Environment:
  MIGRATIONS_DIR  Path to migrations (default: %s)
  Uses standard POSTGRES_* variables from config.

`, migrate.DefaultDir)
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
