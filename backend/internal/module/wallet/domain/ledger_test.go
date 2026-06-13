package domain_test

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	"github.com/imohammadali/arz-baran/backend/internal/module/wallet/domain"
)

var (
	testNow    = time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	assetBTC   = kernel.AssetID("BTC")
	assetUSDT  = kernel.AssetID("USDT")
	zeroID     = kernel.NewID()
)

// helpers

func newEntry(t *testing.T, dir domain.Direction, amount string, asset kernel.AssetID) domain.LedgerEntry {
	t.Helper()
	e, err := domain.NewLedgerEntry(
		kernel.NewID(), kernel.NewID(), kernel.NewID(),
		dir, decimal.RequireFromString(amount), asset, testNow,
	)
	if err != nil {
		t.Fatalf("NewLedgerEntry(%s %s %s): unexpected error: %v", dir, amount, asset, err)
	}
	return *e
}

func newTx(t *testing.T, entries []domain.LedgerEntry) *domain.Transaction {
	t.Helper()
	tx, err := domain.NewTransaction(kernel.NewID(), "idem-key-1", domain.TxTypeDeposit, entries, testNow)
	if err != nil {
		t.Fatalf("NewTransaction: unexpected error: %v", err)
	}
	return tx
}

// --- LedgerEntry ---

func TestNewLedgerEntry_PositiveAmount(t *testing.T) {
	_, err := domain.NewLedgerEntry(
		kernel.NewID(), kernel.NewID(), kernel.NewID(),
		domain.DirectionCredit, decimal.NewFromInt(100), assetBTC, testNow,
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestNewLedgerEntry_ZeroAmount(t *testing.T) {
	_, err := domain.NewLedgerEntry(
		kernel.NewID(), kernel.NewID(), kernel.NewID(),
		domain.DirectionCredit, decimal.Zero, assetBTC, testNow,
	)
	if err == nil {
		t.Fatal("expected error for zero amount")
	}
}

func TestNewLedgerEntry_NegativeAmount(t *testing.T) {
	_, err := domain.NewLedgerEntry(
		kernel.NewID(), kernel.NewID(), kernel.NewID(),
		domain.DirectionDebit, decimal.NewFromInt(-50), assetBTC, testNow,
	)
	if err == nil {
		t.Fatal("expected error for negative amount")
	}
}

// --- Transaction double-entry ---

func TestNewTransaction_Balanced(t *testing.T) {
	entries := []domain.LedgerEntry{
		newEntry(t, domain.DirectionDebit, "100", assetBTC),
		newEntry(t, domain.DirectionCredit, "100", assetBTC),
	}
	tx := newTx(t, entries)
	if tx.Status != domain.TxStatusPending {
		t.Errorf("expected Pending, got %v", tx.Status)
	}
}

func TestNewTransaction_Unbalanced(t *testing.T) {
	entries := []domain.LedgerEntry{
		newEntry(t, domain.DirectionDebit, "100", assetBTC),
		newEntry(t, domain.DirectionCredit, "90", assetBTC),
	}
	_, err := domain.NewTransaction(kernel.NewID(), "idem-2", domain.TxTypeDeposit, entries, testNow)
	if err == nil {
		t.Fatal("expected error for unbalanced transaction")
	}
	kerr, ok := err.(kernel.Error)
	if !ok {
		t.Fatalf("expected kernel.Error, got %T", err)
	}
	if kerr.Code() != domain.CodeUnbalancedTransaction {
		t.Errorf("expected CodeUnbalancedTransaction, got %v", kerr.Code())
	}
}

func TestNewTransaction_EmptyEntries(t *testing.T) {
	_, err := domain.NewTransaction(kernel.NewID(), "idem-3", domain.TxTypeDeposit, nil, testNow)
	if err == nil {
		t.Fatal("expected error for empty entries")
	}
}

func TestNewTransaction_EmptyIdempotencyKey(t *testing.T) {
	entries := []domain.LedgerEntry{
		newEntry(t, domain.DirectionDebit, "50", assetBTC),
		newEntry(t, domain.DirectionCredit, "50", assetBTC),
	}
	_, err := domain.NewTransaction(kernel.NewID(), "  ", domain.TxTypeDeposit, entries, testNow)
	if err == nil {
		t.Fatal("expected error for whitespace idempotency key")
	}
}

func TestNewTransaction_MultiAssetBalanced(t *testing.T) {
	// BTC leg: debit 1, credit 1 — USDT leg: debit 500, credit 500
	entries := []domain.LedgerEntry{
		newEntry(t, domain.DirectionDebit, "1", assetBTC),
		newEntry(t, domain.DirectionCredit, "1", assetBTC),
		newEntry(t, domain.DirectionDebit, "500", assetUSDT),
		newEntry(t, domain.DirectionCredit, "500", assetUSDT),
	}
	tx := newTx(t, entries)
	if tx == nil {
		t.Fatal("expected valid transaction")
	}
}

func TestNewTransaction_MultiAssetUnbalanced(t *testing.T) {
	// BTC is balanced; USDT is not
	entries := []domain.LedgerEntry{
		newEntry(t, domain.DirectionDebit, "1", assetBTC),
		newEntry(t, domain.DirectionCredit, "1", assetBTC),
		newEntry(t, domain.DirectionDebit, "500", assetUSDT),
		newEntry(t, domain.DirectionCredit, "400", assetUSDT),
	}
	_, err := domain.NewTransaction(kernel.NewID(), "idem-4", domain.TxTypeDeposit, entries, testNow)
	if err == nil {
		t.Fatal("expected error for unbalanced USDT leg")
	}
}

// --- Transaction.Complete ---

func TestTransaction_Complete(t *testing.T) {
	entries := []domain.LedgerEntry{
		newEntry(t, domain.DirectionDebit, "10", assetBTC),
		newEntry(t, domain.DirectionCredit, "10", assetBTC),
	}
	tx := newTx(t, entries)
	if err := tx.Complete(testNow); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tx.Status != domain.TxStatusCompleted {
		t.Errorf("expected Completed, got %v", tx.Status)
	}
	if len(tx.Events()) != 1 || tx.Events()[0].EventType() != "wallet.transaction_completed" {
		t.Error("expected TransactionCompletedEvent")
	}
}

func TestTransaction_CompleteAlreadyCompleted(t *testing.T) {
	entries := []domain.LedgerEntry{
		newEntry(t, domain.DirectionDebit, "10", assetBTC),
		newEntry(t, domain.DirectionCredit, "10", assetBTC),
	}
	tx := newTx(t, entries)
	_ = tx.Complete(testNow)
	if err := tx.Complete(testNow); err == nil {
		t.Fatal("expected error on double Complete")
	}
}

// --- Hold state machine ---

func newActiveHold(t *testing.T) *domain.Hold {
	t.Helper()
	h, err := domain.NewHold(kernel.NewID(), kernel.NewID(), decimal.NewFromInt(100), assetBTC, "hold-idem-1", testNow)
	if err != nil {
		t.Fatalf("NewHold: unexpected error: %v", err)
	}
	return h
}

func TestNewHold_ZeroAmount(t *testing.T) {
	_, err := domain.NewHold(kernel.NewID(), kernel.NewID(), decimal.Zero, assetBTC, "k", testNow)
	if err == nil {
		t.Fatal("expected error for zero hold amount")
	}
}

func TestNewHold_NegativeAmount(t *testing.T) {
	_, err := domain.NewHold(kernel.NewID(), kernel.NewID(), decimal.NewFromInt(-1), assetBTC, "k", testNow)
	if err == nil {
		t.Fatal("expected error for negative hold amount")
	}
}

func TestHold_ReleaseActiveToReleased(t *testing.T) {
	h := newActiveHold(t)
	h.ClearEvents()
	if err := h.Release(testNow); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if h.Status != domain.HoldStatusReleased {
		t.Errorf("expected Released, got %v", h.Status)
	}
	if len(h.Events()) != 1 || h.Events()[0].EventType() != "wallet.hold_released" {
		t.Error("expected HoldReleasedEvent")
	}
}

func TestHold_SettleActiveToSettled(t *testing.T) {
	h := newActiveHold(t)
	h.ClearEvents()
	if err := h.Settle(testNow); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if h.Status != domain.HoldStatusSettled {
		t.Errorf("expected Settled, got %v", h.Status)
	}
	if len(h.Events()) != 1 || h.Events()[0].EventType() != "wallet.hold_settled" {
		t.Error("expected HoldSettledEvent")
	}
}

func TestHold_ReleaseAfterSettled(t *testing.T) {
	h := newActiveHold(t)
	_ = h.Settle(testNow)
	if err := h.Release(testNow); err == nil {
		t.Fatal("expected error: cannot release a settled hold")
	}
}

func TestHold_SettleAfterReleased(t *testing.T) {
	h := newActiveHold(t)
	_ = h.Release(testNow)
	if err := h.Settle(testNow); err == nil {
		t.Fatal("expected error: cannot settle a released hold")
	}
}

func TestHold_EmitsBalanceHeldOnCreation(t *testing.T) {
	h := newActiveHold(t)
	events := h.Events()
	if len(events) != 1 {
		t.Fatalf("expected 1 event on creation, got %d", len(events))
	}
	if events[0].EventType() != "wallet.balance_held" {
		t.Errorf("expected wallet.balance_held, got %q", events[0].EventType())
	}
}
