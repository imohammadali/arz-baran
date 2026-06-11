// Package service implements wallet application use cases.
package service

import (
	"context"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	walletapi "github.com/imohammadali/arz-baran/backend/internal/module/wallet/api"
)

// Service implements wallet.API.
type Service struct{}

// New constructs the wallet application service.
func New() *Service {
	return &Service{}
}

// PlaceHold implements wallet/api.API.
func (s *Service) PlaceHold(_ context.Context, _ walletapi.PlaceHoldCommand) (walletapi.HoldID, error) {
	var zero walletapi.HoldID
	return zero, kernel.NewApplicationError(kernel.ModuleWallet, "WALLET_NOT_IMPLEMENTED", "wallet module not implemented")
}

// ReleaseHold implements wallet/api.API.
func (s *Service) ReleaseHold(_ context.Context, _ walletapi.ReleaseHoldCommand) error {
	return kernel.NewApplicationError(kernel.ModuleWallet, "WALLET_NOT_IMPLEMENTED", "wallet module not implemented")
}

// Settle implements wallet/api.API.
func (s *Service) Settle(_ context.Context, _ walletapi.SettleCommand) error {
	return kernel.NewApplicationError(kernel.ModuleWallet, "WALLET_NOT_IMPLEMENTED", "wallet module not implemented")
}

var _ walletapi.API = (*Service)(nil)
