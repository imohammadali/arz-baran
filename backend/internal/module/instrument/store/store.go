// Package store defines instrument persistence ports (implemented via sqlc in gen/sqlc/instrument).
package store

import (
	"context"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	instrumentapi "github.com/imohammadali/arz-baran/backend/internal/module/instrument/api"
)

// Repository is the instrument persistence port.
type Repository interface {
	GetAsset(ctx context.Context, id kernel.AssetID) (*instrumentapi.Asset, error)
}
