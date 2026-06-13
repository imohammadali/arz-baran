package domain_test

import (
	"testing"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	"github.com/imohammadali/arz-baran/backend/internal/module/instrument/domain"
)

func TestNewAsset_HappyPath(t *testing.T) {
	a, err := domain.NewAsset(kernel.AssetID("BTC"), "btc", "Bitcoin", 8)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.Symbol != "BTC" {
		t.Errorf("expected symbol BTC (normalized), got %q", a.Symbol)
	}
	if a.Name != "Bitcoin" {
		t.Errorf("expected name Bitcoin, got %q", a.Name)
	}
	if a.Decimals != 8 {
		t.Errorf("expected 8 decimals, got %d", a.Decimals)
	}
	if !a.IsEnabled {
		t.Error("expected asset to be enabled on creation")
	}
}

func TestNewAsset_EmptySymbol(t *testing.T) {
	_, err := domain.NewAsset(kernel.AssetID("X"), "", "Bitcoin", 8)
	if err == nil {
		t.Fatal("expected error for empty symbol")
	}
}

func TestNewAsset_EmptyName(t *testing.T) {
	_, err := domain.NewAsset(kernel.AssetID("BTC"), "BTC", "", 8)
	if err == nil {
		t.Fatal("expected error for empty name")
	}
}

func TestNewAsset_NegativeDecimals(t *testing.T) {
	_, err := domain.NewAsset(kernel.AssetID("BTC"), "BTC", "Bitcoin", -1)
	if err == nil {
		t.Fatal("expected error for decimals = -1")
	}
}

func TestNewAsset_DecimalsTooHigh(t *testing.T) {
	_, err := domain.NewAsset(kernel.AssetID("BTC"), "BTC", "Bitcoin", 19)
	if err == nil {
		t.Fatal("expected error for decimals = 19")
	}
}

func TestNewAsset_BoundaryDecimals(t *testing.T) {
	for _, d := range []int{0, 18} {
		a, err := domain.NewAsset(kernel.AssetID("X"), "X", "X coin", d)
		if err != nil {
			t.Errorf("expected no error for decimals=%d, got %v", d, err)
		}
		if a == nil {
			t.Errorf("expected non-nil asset for decimals=%d", d)
		}
	}
}

func TestAsset_EnableDisable(t *testing.T) {
	a, _ := domain.NewAsset(kernel.AssetID("ETH"), "ETH", "Ethereum", 18)
	a.Disable()
	if a.IsEnabled {
		t.Error("expected disabled after Disable()")
	}
	a.Enable()
	if !a.IsEnabled {
		t.Error("expected enabled after Enable()")
	}
}
