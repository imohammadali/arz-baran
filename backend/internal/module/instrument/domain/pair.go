package domain

import (
	"fmt"

	"github.com/shopspring/decimal"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// TradingPair defines the constraints for a tradable base/quote Asset pair.
type TradingPair struct {
	ID                kernel.PairID
	BaseAsset         kernel.AssetID
	QuoteAsset        kernel.AssetID
	MinOrderSize      decimal.Decimal
	MaxOrderSize      decimal.Decimal
	PricePrecision    int
	QuantityPrecision int
	IsEnabled         bool
}

// NewTradingPair constructs a validated TradingPair in the enabled state.
func NewTradingPair(
	id kernel.PairID,
	base kernel.AssetID,
	quote kernel.AssetID,
	minSize decimal.Decimal,
	maxSize decimal.Decimal,
	pricePrecision int,
	qtyPrecision int,
) (*TradingPair, error) {
	if base == quote {
		return nil, kernel.NewDomainError(
			kernel.ModuleInstrument,
			CodePairNotFound,
			"base and quote assets must differ",
		)
	}
	if minSize.LessThanOrEqual(decimal.Zero) {
		return nil, kernel.NewDomainError(
			kernel.ModuleInstrument,
			CodeInvalidOrderSize,
			fmt.Sprintf("minOrderSize must be > 0, got %s", minSize),
		)
	}
	if maxSize.LessThan(minSize) {
		return nil, kernel.NewDomainError(
			kernel.ModuleInstrument,
			CodeInvalidOrderSize,
			fmt.Sprintf("maxOrderSize (%s) must be >= minOrderSize (%s)", maxSize, minSize),
		)
	}
	if pricePrecision < 0 {
		return nil, kernel.NewDomainError(
			kernel.ModuleInstrument,
			CodePairNotFound,
			fmt.Sprintf("pricePrecision must be >= 0, got %d", pricePrecision),
		)
	}
	if qtyPrecision < 0 {
		return nil, kernel.NewDomainError(
			kernel.ModuleInstrument,
			CodePairNotFound,
			fmt.Sprintf("quantityPrecision must be >= 0, got %d", qtyPrecision),
		)
	}
	return &TradingPair{
		ID:                id,
		BaseAsset:         base,
		QuoteAsset:        quote,
		MinOrderSize:      minSize,
		MaxOrderSize:      maxSize,
		PricePrecision:    pricePrecision,
		QuantityPrecision: qtyPrecision,
		IsEnabled:         true,
	}, nil
}

// Enable marks the pair as available for trading.
func (p *TradingPair) Enable() { p.IsEnabled = true }

// Disable marks the pair as unavailable; no new orders should be accepted.
func (p *TradingPair) Disable() { p.IsEnabled = false }

// ValidateOrderSize returns an error if qty is outside [MinOrderSize, MaxOrderSize].
func (p *TradingPair) ValidateOrderSize(qty decimal.Decimal) error {
	if qty.LessThan(p.MinOrderSize) {
		return ErrInvalidOrderSize(
			fmt.Sprintf("order size %s is below minimum %s", qty, p.MinOrderSize),
		)
	}
	if qty.GreaterThan(p.MaxOrderSize) {
		return ErrInvalidOrderSize(
			fmt.Sprintf("order size %s exceeds maximum %s", qty, p.MaxOrderSize),
		)
	}
	return nil
}
