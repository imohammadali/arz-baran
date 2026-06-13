package domain_test

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	"github.com/imohammadali/arz-baran/backend/internal/module/trading/domain"
)

var testNow = time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

func validLimitOrder(t *testing.T) *domain.Order {
	t.Helper()
	o, err := domain.NewLimitOrder(
		kernel.NewID(),
		kernel.NewID(),
		kernel.PairID("BTC-USDT"),
		domain.SideBuy,
		decimal.NewFromFloat(50000),
		decimal.NewFromFloat(0.1),
		"idem-key-1",
		testNow,
	)
	if err != nil {
		t.Fatalf("NewLimitOrder: unexpected error: %v", err)
	}
	return o
}

// --- NewLimitOrder ---

func TestNewLimitOrder_HappyPath(t *testing.T) {
	o := validLimitOrder(t)

	if o.Status != domain.OrderStatusPending {
		t.Errorf("expected Pending, got %v", o.Status)
	}
	if !o.RemainingQty.Equal(o.Quantity) {
		t.Errorf("RemainingQty should equal Quantity on creation")
	}
	if !o.FilledQty.IsZero() {
		t.Errorf("FilledQty should be zero on creation")
	}
	if o.Price == nil {
		t.Error("limit order must have a price")
	}

	events := o.Events()
	if len(events) != 1 || events[0].EventType() != "trading.order_placed" {
		t.Errorf("expected order_placed event, got %v", events)
	}
}

func TestNewLimitOrder_ZeroPrice(t *testing.T) {
	_, err := domain.NewLimitOrder(
		kernel.NewID(), kernel.NewID(), kernel.PairID("BTC-USDT"),
		domain.SideBuy, decimal.Zero, decimal.NewFromFloat(0.1), "k", testNow,
	)
	if err == nil {
		t.Fatal("expected error for zero price")
	}
}

func TestNewLimitOrder_NegativePrice(t *testing.T) {
	_, err := domain.NewLimitOrder(
		kernel.NewID(), kernel.NewID(), kernel.PairID("BTC-USDT"),
		domain.SideBuy, decimal.NewFromFloat(-1), decimal.NewFromFloat(0.1), "k", testNow,
	)
	if err == nil {
		t.Fatal("expected error for negative price")
	}
}

func TestNewLimitOrder_ZeroQty(t *testing.T) {
	_, err := domain.NewLimitOrder(
		kernel.NewID(), kernel.NewID(), kernel.PairID("BTC-USDT"),
		domain.SideBuy, decimal.NewFromFloat(50000), decimal.Zero, "k", testNow,
	)
	if err == nil {
		t.Fatal("expected error for zero quantity")
	}
}

func TestNewLimitOrder_EmptyIdempotencyKey(t *testing.T) {
	_, err := domain.NewLimitOrder(
		kernel.NewID(), kernel.NewID(), kernel.PairID("BTC-USDT"),
		domain.SideBuy, decimal.NewFromFloat(50000), decimal.NewFromFloat(1), "  ", testNow,
	)
	if err == nil {
		t.Fatal("expected error for empty idempotency key")
	}
}

// --- NewMarketOrder ---

func TestNewMarketOrder_HappyPath(t *testing.T) {
	o, err := domain.NewMarketOrder(
		kernel.NewID(), kernel.NewID(), kernel.PairID("BTC-USDT"),
		domain.SideSell, decimal.NewFromFloat(0.5), "market-key", testNow,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if o.Price != nil {
		t.Error("market order must have nil price")
	}
	if o.Type != domain.OrderTypeMarket {
		t.Errorf("expected market type, got %v", o.Type)
	}
}

// --- Open ---

func TestOpen_PendingToOpen(t *testing.T) {
	o := validLimitOrder(t)
	o.ClearEvents()

	if err := o.Open(testNow); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if o.Status != domain.OrderStatusOpen {
		t.Errorf("expected Open, got %v", o.Status)
	}
	if len(o.Events()) != 1 || o.Events()[0].EventType() != "trading.order_opened" {
		t.Error("expected order_opened event")
	}
}

func TestOpen_AlreadyOpen(t *testing.T) {
	o := validLimitOrder(t)
	_ = o.Open(testNow)
	if err := o.Open(testNow); err == nil {
		t.Fatal("expected error when opening already-open order")
	}
}

// --- Fill ---

func openOrder(t *testing.T) *domain.Order {
	t.Helper()
	o := validLimitOrder(t)
	if err := o.Open(testNow); err != nil {
		t.Fatalf("Open: %v", err)
	}
	o.ClearEvents()
	return o
}

func TestFill_Partial(t *testing.T) {
	o := openOrder(t)
	qty := o.Quantity

	fillAmt := qty.Div(decimal.NewFromInt(2))
	if err := o.Fill(fillAmt, testNow); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if o.Status != domain.OrderStatusPartiallyFilled {
		t.Errorf("expected PartiallyFilled, got %v", o.Status)
	}
	if !o.FilledQty.Equal(fillAmt) {
		t.Errorf("FilledQty mismatch: want %s got %s", fillAmt, o.FilledQty)
	}
	if !o.RemainingQty.Equal(qty.Sub(fillAmt)) {
		t.Errorf("RemainingQty mismatch")
	}

	events := o.Events()
	if len(events) != 1 || events[0].EventType() != "trading.order_partially_filled" {
		t.Error("expected order_partially_filled event")
	}
}

func TestFill_Complete(t *testing.T) {
	o := openOrder(t)

	if err := o.Fill(o.Quantity, testNow); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if o.Status != domain.OrderStatusFilled {
		t.Errorf("expected Filled, got %v", o.Status)
	}
	if !o.RemainingQty.IsZero() {
		t.Errorf("RemainingQty should be zero after full fill")
	}

	events := o.Events()
	if len(events) != 1 || events[0].EventType() != "trading.order_filled" {
		t.Error("expected order_filled event")
	}
}

func TestFill_Overfill(t *testing.T) {
	o := openOrder(t)
	overQty := o.Quantity.Add(decimal.NewFromFloat(0.0001))
	if err := o.Fill(overQty, testNow); err == nil {
		t.Fatal("expected error for overfill")
	}
}

func TestFill_TwoPartialsToFull(t *testing.T) {
	o := openOrder(t)
	half := o.Quantity.Div(decimal.NewFromInt(2))

	_ = o.Fill(half, testNow)
	o.ClearEvents()
	if err := o.Fill(half, testNow); err != nil {
		t.Fatalf("second fill unexpected error: %v", err)
	}
	if o.Status != domain.OrderStatusFilled {
		t.Errorf("expected Filled after two halves, got %v", o.Status)
	}
}

// --- Cancel ---

func TestCancel_OpenOrder(t *testing.T) {
	o := openOrder(t)
	if err := o.Cancel(testNow); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if o.Status != domain.OrderStatusCancelled {
		t.Errorf("expected Cancelled, got %v", o.Status)
	}
}

func TestCancel_FilledOrder(t *testing.T) {
	o := openOrder(t)
	_ = o.Fill(o.Quantity, testNow)
	if err := o.Cancel(testNow); err == nil {
		t.Fatal("expected error cancelling a filled order")
	}
}

func TestCancel_AlreadyCancelled(t *testing.T) {
	o := openOrder(t)
	_ = o.Cancel(testNow)
	if err := o.Cancel(testNow); err == nil {
		t.Fatal("expected error cancelling an already-cancelled order")
	}
}

// --- Trade ---

func TestNewTrade_HappyPath(t *testing.T) {
	tr, err := domain.NewTrade(
		kernel.NewID(),
		kernel.NewID(),
		kernel.NewID(),
		kernel.PairID("BTC-USDT"),
		decimal.NewFromFloat(50000),
		decimal.NewFromFloat(0.1),
		domain.SideBuy,
		testNow,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tr.Price.IsZero() || tr.Quantity.IsZero() {
		t.Error("price and quantity must be non-zero")
	}
}

func TestNewTrade_ZeroPrice(t *testing.T) {
	_, err := domain.NewTrade(
		kernel.NewID(), kernel.NewID(), kernel.NewID(),
		kernel.PairID("BTC-USDT"),
		decimal.Zero, decimal.NewFromFloat(0.1), domain.SideBuy, testNow,
	)
	if err == nil {
		t.Fatal("expected error for zero trade price")
	}
}

func TestNewTrade_ZeroQty(t *testing.T) {
	_, err := domain.NewTrade(
		kernel.NewID(), kernel.NewID(), kernel.NewID(),
		kernel.PairID("BTC-USDT"),
		decimal.NewFromFloat(50000), decimal.Zero, domain.SideBuy, testNow,
	)
	if err == nil {
		t.Fatal("expected error for zero trade quantity")
	}
}
