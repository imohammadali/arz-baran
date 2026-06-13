package domain

import (
	"fmt"
	"time"

	"github.com/shopspring/decimal"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// HoldStatus represents the lifecycle state of a Hold.
type HoldStatus string

const (
	// HoldStatusActive means the funds are reserved; available balance is reduced.
	HoldStatusActive HoldStatus = "active"
	// HoldStatusReleased means the reservation was cancelled; no ledger posting was made.
	HoldStatusReleased HoldStatus = "released"
	// HoldStatusSettled means the reservation was consumed; a ledger posting was made.
	HoldStatusSettled HoldStatus = "settled"
)

// Hold represents a temporary reservation of available balance on an Account.
// It reduces spendable capacity without posting a LedgerEntry.
// Amount is ALWAYS positive.
type Hold struct {
	ID             kernel.ID
	AccountID      kernel.ID
	Amount         decimal.Decimal
	AssetID        kernel.AssetID
	Status         HoldStatus
	IdempotencyKey string
	CreatedAt      time.Time
	UpdatedAt      time.Time

	events []DomainEvent
}

// NewHold constructs an Active Hold. Amount must be strictly positive.
func NewHold(
	id kernel.ID,
	accountID kernel.ID,
	amount decimal.Decimal,
	assetID kernel.AssetID,
	idempotencyKey string,
	now time.Time,
) (*Hold, error) {
	if !amount.IsPositive() {
		return nil, kernel.NewDomainError(
			kernel.ModuleWallet,
			CodeInsufficientBalance,
			fmt.Sprintf("hold amount must be > 0, got %s", amount),
		)
	}
	h := &Hold{
		ID:             id,
		AccountID:      accountID,
		Amount:         amount,
		AssetID:        assetID,
		Status:         HoldStatusActive,
		IdempotencyKey: idempotencyKey,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	h.record(BalanceHeldEvent{
		baseEvent: baseEvent{aggregateID: id, occurredAt: now},
		HoldID:    id,
		AccountID: accountID,
	})
	return h, nil
}

// Release transitions an Active Hold to Released.
// No LedgerEntry is created; available balance is simply restored.
func (h *Hold) Release(now time.Time) error {
	if err := h.requireActive("release"); err != nil {
		return err
	}
	h.Status = HoldStatusReleased
	h.UpdatedAt = now
	h.record(HoldReleasedEvent{
		baseEvent: baseEvent{aggregateID: h.ID, occurredAt: now},
		HoldID:    h.ID,
		AccountID: h.AccountID,
	})
	return nil
}

// Settle transitions an Active Hold to Settled.
// The caller is responsible for creating the corresponding LedgerEntries via a Transaction.
func (h *Hold) Settle(now time.Time) error {
	if err := h.requireActive("settle"); err != nil {
		return err
	}
	h.Status = HoldStatusSettled
	h.UpdatedAt = now
	h.record(HoldSettledEvent{
		baseEvent: baseEvent{aggregateID: h.ID, occurredAt: now},
		HoldID:    h.ID,
		AccountID: h.AccountID,
	})
	return nil
}

// Events returns uncommitted domain events.
func (h *Hold) Events() []DomainEvent { return h.events }

// ClearEvents discards accumulated domain events after dispatch.
func (h *Hold) ClearEvents() { h.events = nil }

func (h *Hold) record(e DomainEvent) { h.events = append(h.events, e) }

func (h *Hold) requireActive(op string) error {
	if h.Status == HoldStatusActive {
		return nil
	}
	return kernel.NewDomainError(
		kernel.ModuleWallet,
		CodeHoldAlreadySettled,
		fmt.Sprintf("cannot %s hold: current status is %s", op, h.Status),
	)
}
