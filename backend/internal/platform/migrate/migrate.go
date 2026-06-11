// Package migrate runs Goose database migrations.
package migrate

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	"github.com/imohammadali/arz-baran/backend/internal/platform/config"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

// DefaultDir is the Goose migrations directory relative to the module root.
const DefaultDir = "migrations"

// Run applies pending migrations when enabled in configuration.
func Run(ctx context.Context, cfg config.Postgres, dir string) error {
	if !cfg.RunMigrations {
		return nil
	}
	return Up(ctx, cfg, dir)
}

// Up applies all pending migrations.
func Up(ctx context.Context, cfg config.Postgres, dir string) error {
	db, err := open(ctx, cfg)
	if err != nil {
		return err
	}
	defer db.Close()

	if err := goose.UpContext(ctx, db, dir); err != nil {
		return fmt.Errorf("migrate up: %w", err)
	}
	return nil
}

// Down rolls back a single migration.
func Down(ctx context.Context, cfg config.Postgres, dir string) error {
	db, err := open(ctx, cfg)
	if err != nil {
		return err
	}
	defer db.Close()

	if err := goose.DownContext(ctx, db, dir); err != nil {
		return fmt.Errorf("migrate down: %w", err)
	}
	return nil
}

// Status prints migration status to stdout.
func Status(ctx context.Context, cfg config.Postgres, dir string) error {
	db, err := open(ctx, cfg)
	if err != nil {
		return err
	}
	defer db.Close()

	if err := goose.Status(db, dir); err != nil {
		return fmt.Errorf("migrate status: %w", err)
	}
	return nil
}

// Version returns the current migration version.
func Version(ctx context.Context, cfg config.Postgres, dir string) (int64, error) {
	db, err := open(ctx, cfg)
	if err != nil {
		return 0, err
	}
	defer db.Close()

	version, err := goose.GetDBVersion(db)
	if err != nil {
		return 0, fmt.Errorf("migrate version: %w", err)
	}
	return version, nil
}

func open(ctx context.Context, cfg config.Postgres) (*sql.DB, error) {
	db, err := sql.Open("pgx", cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("migrate open: %w", err)
	}

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate ping: %w", err)
	}

	if err := goose.SetDialect("postgres"); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate dialect: %w", err)
	}

	return db, nil
}

// PrintVersion writes the current migration version to stdout.
func PrintVersion(ctx context.Context, cfg config.Postgres, dir string) error {
	version, err := Version(ctx, cfg, dir)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(os.Stdout, "goose version: %d\n", version)
	return err
}
