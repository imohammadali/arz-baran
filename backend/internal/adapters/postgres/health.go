package postgres

import (
	"context"
	"fmt"

	db "backend/gen/sqlc"
	platformpostgres "backend/internal/platform/postgres"
)

type HealthChecker struct {
	pool    *platformpostgres.Pool
	queries *db.Queries
}

func NewHealthChecker(pool *platformpostgres.Pool) *HealthChecker {
	return &HealthChecker{
		pool:    pool,
		queries: db.New(pool.Pool),
	}
}

func (h *HealthChecker) Ping(ctx context.Context) error {
	if err := h.pool.Ping(ctx); err != nil {
		return fmt.Errorf("pool ping: %w", err)
	}

	if _, err := h.queries.Ping(ctx); err != nil {
		return fmt.Errorf("sqlc ping: %w", err)
	}

	return nil
}
