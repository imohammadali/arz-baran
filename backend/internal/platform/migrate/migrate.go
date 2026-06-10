package migrate

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pressly/goose/v3"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func Up(ctx context.Context, databaseURL, dir string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer db.Close()

	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set dialect: %w", err)
	}

	if err := goose.UpContext(ctx, db, dir); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}

	return nil
}
