package domain

import (
	"fmt"
	"strings"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

const (
	minDecimals = 0
	maxDecimals = 18
)

// Asset is a reference-data entity representing a tradable or on-chain asset
// in the instrument catalog.
type Asset struct {
	ID        kernel.AssetID
	Symbol    string
	Name      string
	Decimals  int
	IsEnabled bool
}

// NewAsset constructs a validated Asset in the enabled state.
func NewAsset(id kernel.AssetID, symbol, name string, decimals int) (*Asset, error) {
	if strings.TrimSpace(symbol) == "" {
		return nil, kernel.NewDomainError(kernel.ModuleInstrument, CodeAssetNotFound, "symbol must not be empty")
	}
	if strings.TrimSpace(name) == "" {
		return nil, kernel.NewDomainError(kernel.ModuleInstrument, CodeAssetNotFound, "name must not be empty")
	}
	if decimals < minDecimals || decimals > maxDecimals {
		return nil, kernel.NewDomainError(
			kernel.ModuleInstrument,
			CodeAssetNotFound,
			fmt.Sprintf("decimals must be between %d and %d, got %d", minDecimals, maxDecimals, decimals),
		)
	}
	return &Asset{
		ID:        id,
		Symbol:    strings.ToUpper(strings.TrimSpace(symbol)),
		Name:      strings.TrimSpace(name),
		Decimals:  decimals,
		IsEnabled: true,
	}, nil
}

// Enable marks the asset as enabled for trading and deposit/withdrawal.
func (a *Asset) Enable() { a.IsEnabled = true }

// Disable marks the asset as disabled; no new operations should be accepted.
func (a *Asset) Disable() { a.IsEnabled = false }
