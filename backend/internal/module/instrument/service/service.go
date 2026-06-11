// Package service implements instrument application use cases.
package service

import (
	"context"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	instrumentapi "github.com/imohammadali/arz-baran/backend/internal/module/instrument/api"
)

// Service implements instrument.API.
type Service struct {
	repo instrumentStore
}

type instrumentStore interface {
	GetAsset(ctx context.Context, id kernel.AssetID) (*instrumentapi.Asset, error)
}

// New constructs the instrument application service.
func New(repo instrumentStore) *Service {
	return &Service{repo: repo}
}

// GetAsset implements instrument/api.API.
func (s *Service) GetAsset(ctx context.Context, id kernel.AssetID) (*instrumentapi.Asset, error) {
	if s.repo == nil {
		return nil, kernel.NewApplicationError(kernel.ModuleInstrument, "INSTRUMENT_NOT_FOUND", "asset not found")
	}
	return s.repo.GetAsset(ctx, id)
}

var _ instrumentapi.API = (*Service)(nil)
