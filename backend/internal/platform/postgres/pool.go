// Package postgres provides the shared PostgreSQL connection pool.
package postgres

import (
	"context"
	"fmt"

	"github.com/imohammadali/arz-baran/backend/internal/platform/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool wraps a pgx connection pool.
type Pool struct {
	*pgxpool.Pool
}

// NewPool creates and verifies a PostgreSQL connection pool.
func NewPool(ctx context.Context, cfg config.Postgres) (*Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("postgres: parse config: %w", err)
	}
	poolCfg.MaxConns = int32(cfg.MaxOpenConns)
	poolCfg.MinConns = int32(cfg.MaxIdleConns)

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("postgres: connect: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, cfg.ConnectTimeout)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("postgres: ping: %w", err)
	}

	return &Pool{Pool: pool}, nil
}

// Pinger supports health checks without exposing the full pool.
type Pinger interface {
	Ping(ctx context.Context) error
}
