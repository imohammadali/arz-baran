package domain_test

import (
	"testing"

	"github.com/shopspring/decimal"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	"github.com/imohammadali/arz-baran/backend/internal/module/instrument/domain"
)

const (
	btc  = kernel.AssetID("BTC")
	usdt = kernel.AssetID("USDT")
	eth  = kernel.AssetID("ETH")
)

func validPair(t *testing.T) *domain.TradingPair {
	t.Helper()
	p, err := domain.NewTradingPair(
		kernel.PairID("BTC-USDT"),
		btc, usdt,
		decimal.NewFromFloat(0.001),
		decimal.NewFromFloat(1000),
		2, 8,
	)
	if err != nil {
		t.Fatalf("unexpected error building valid pair: %v", err)
	}
	return p
}

func TestNewTradingPair_HappyPath(t *testing.T) {
	p := validPair(t)

	if p.BaseAsset != btc {
		t.Errorf("expected base BTC, got %v", p.BaseAsset)
	}
	if p.QuoteAsset != usdt {
		t.Errorf("expected quote USDT, got %v", p.QuoteAsset)
	}
	if !p.IsEnabled {
		t.Error("expected pair to be enabled on creation")
	}
	if p.PricePrecision != 2 {
		t.Errorf("expected price precision 2, got %d", p.PricePrecision)
	}
}

func TestNewTradingPair_BaseEqualsQuote(t *testing.T) {
	_, err := domain.NewTradingPair(
		kernel.PairID("BTC-BTC"),
		btc, btc,
		decimal.NewFromFloat(0.001),
		decimal.NewFromFloat(1000),
		2, 8,
	)
	if err == nil {
		t.Fatal("expected error when base == quote")
	}
}

func TestNewTradingPair_MinSizeZero(t *testing.T) {
	_, err := domain.NewTradingPair(
		kernel.PairID("BTC-USDT"),
		btc, usdt,
		decimal.Zero,
		decimal.NewFromFloat(1000),
		2, 8,
	)
	if err == nil {
		t.Fatal("expected error for minSize = 0")
	}
}

func TestNewTradingPair_MinSizeNegative(t *testing.T) {
	_, err := domain.NewTradingPair(
		kernel.PairID("BTC-USDT"),
		btc, usdt,
		decimal.NewFromFloat(-1),
		decimal.NewFromFloat(1000),
		2, 8,
	)
	if err == nil {
		t.Fatal("expected error for minSize < 0")
	}
}

func TestNewTradingPair_MaxSizeLessThanMin(t *testing.T) {
	_, err := domain.NewTradingPair(
		kernel.PairID("BTC-USDT"),
		btc, usdt,
		decimal.NewFromFloat(10),
		decimal.NewFromFloat(5),
		2, 8,
	)
	if err == nil {
		t.Fatal("expected error when maxSize < minSize")
	}
}

func TestNewTradingPair_MaxSizeEqualsMin(t *testing.T) {
	// maxSize == minSize is valid (fixed-size orders)
	size := decimal.NewFromFloat(1)
	_, err := domain.NewTradingPair(
		kernel.PairID("ETH-USDT"),
		eth, usdt,
		size, size,
		2, 8,
	)
	if err != nil {
		t.Fatalf("expected no error when maxSize == minSize, got %v", err)
	}
}

func TestValidateOrderSize_BelowMin(t *testing.T) {
	p := validPair(t)
	err := p.ValidateOrderSize(decimal.NewFromFloat(0.0001))
	if err == nil {
		t.Fatal("expected error for order size below minimum")
	}
}

func TestValidateOrderSize_AboveMax(t *testing.T) {
	p := validPair(t)
	err := p.ValidateOrderSize(decimal.NewFromFloat(9999))
	if err == nil {
		t.Fatal("expected error for order size above maximum")
	}
}

func TestValidateOrderSize_AtBoundaries(t *testing.T) {
	p := validPair(t)

	if err := p.ValidateOrderSize(decimal.NewFromFloat(0.001)); err != nil {
		t.Errorf("expected no error at min boundary, got %v", err)
	}
	if err := p.ValidateOrderSize(decimal.NewFromFloat(1000)); err != nil {
		t.Errorf("expected no error at max boundary, got %v", err)
	}
}

func TestTradingPair_EnableDisable(t *testing.T) {
	p := validPair(t)
	p.Disable()
	if p.IsEnabled {
		t.Error("expected disabled after Disable()")
	}
	p.Enable()
	if !p.IsEnabled {
		t.Error("expected enabled after Enable()")
	}
}
