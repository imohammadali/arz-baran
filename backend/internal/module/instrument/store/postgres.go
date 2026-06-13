// Package store implements the instrument persistence port backed by PostgreSQL.
package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	instrumentdb "github.com/imohammadali/arz-baran/backend/gen/sqlc/instrument"
	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	instrumentapi "github.com/imohammadali/arz-baran/backend/internal/module/instrument/api"
	"github.com/imohammadali/arz-baran/backend/internal/module/instrument/domain"
)

// PostgresRepository implements store.Repository using the pgx/v5 pool.
type PostgresRepository struct {
	q *instrumentdb.Queries
}

// NewPostgresRepository constructs a repository from the shared connection pool.
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{q: instrumentdb.New(pool)}
}

// GetAsset fetches a single asset by its ID, mapping the DB row to the API type.
func (r *PostgresRepository) GetAsset(ctx context.Context, id kernel.AssetID) (*instrumentapi.Asset, error) {
	row, err := r.q.GetAsset(ctx, string(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAssetNotFound()
		}
		return nil, fmt.Errorf("instrument store: get asset: %w", err)
	}
	return mapAsset(row), nil
}

func mapAsset(row instrumentdb.Asset) *instrumentapi.Asset {
	return &instrumentapi.Asset{
		ID:       kernel.AssetID(row.ID),
		Symbol:   row.Symbol,
		Decimals: int(row.Decimals),
	}
}

var _ Repository = (*PostgresRepository)(nil)
