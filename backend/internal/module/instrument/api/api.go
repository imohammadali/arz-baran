// Package api is the cross-module facade for instrument reference data.
package api

import (
	"context"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// Asset describes a tradable or on-chain asset from the reference catalog.
type Asset struct {
	ID       kernel.AssetID
	Symbol   string
	Decimals int
}

// API is the instrument module boundary.
type API interface {
	GetAsset(ctx context.Context, id kernel.AssetID) (*Asset, error)
}
