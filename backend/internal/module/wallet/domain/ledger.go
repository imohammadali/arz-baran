package domain

import (
	"fmt"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// Direction indicates whether a LedgerEntry is a debit or credit.
type Direction string

const (
	// DirectionDebit reduces the account's balance (funds leaving the account).
	DirectionDebit Direction = "debit"
	// DirectionCredit increases the account's balance (funds entering the account).
	DirectionCredit Direction = "credit"
)

// TransactionType describes the business reason for a Transaction.
type TransactionType string

const (
	TxTypeDeposit         TransactionType = "deposit"
	TxTypeWithdrawal      TransactionType = "withdrawal"
	TxTypeTradeSettlement TransactionType = "trade_settlement"
	TxTypeHoldPlacement   TransactionType = "hold_placement"
	TxTypeHoldRelease     TransactionType = "hold_release"
)

// TransactionStatus represents the lifecycle state of a Transaction.
type TransactionStatus string

const (
	TxStatusPending   TransactionStatus = "pending"
	TxStatusCompleted TransactionStatus = "completed"
	TxStatusReversed  TransactionStatus = "reversed"
)

// LedgerEntry is an immutable value object representing a single debit or credit
// line within a Transaction. Amount is ALWAYS positive — direction carries the sign.
type LedgerEntry struct {
	ID            kernel.ID
	TransactionID kernel.ID
	AccountID     kernel.ID
	Direction     Direction
	Amount        decimal.Decimal
	AssetID       kernel.AssetID
	CreatedAt     time.Time
}

// NewLedgerEntry constructs and validates a LedgerEntry.
// Amount must be strictly positive; direction must be set explicitly.
func NewLedgerEntry(
	id kernel.ID,
	transactionID kernel.ID,
	accountID kernel.ID,
	direction Direction,
	amount decimal.Decimal,
	assetID kernel.AssetID,
	now time.Time,
) (*LedgerEntry, error) {
	if !amount.IsPositive() {
		return nil, kernel.NewDomainError(
			kernel.ModuleWallet,
			CodeUnbalancedTransaction,
			fmt.Sprintf("ledger entry amount must be > 0, got %s", amount),
		)
	}
	return &LedgerEntry{
		ID:            id,
		TransactionID: transactionID,
		AccountID:     accountID,
		Direction:     direction,
		Amount:        amount,
		AssetID:       assetID,
		CreatedAt:     now,
	}, nil
}

// Transaction is the financial aggregate root for a balanced set of LedgerEntries.
// Once completed it is immutable.
type Transaction struct {
	ID             kernel.ID
	IdempotencyKey string
	Type           TransactionType
	Status         TransactionStatus
	Entries        []LedgerEntry
	CreatedAt      time.Time
	CompletedAt    *time.Time

	events []DomainEvent
}

// NewTransaction constructs a Transaction in Pending status and validates the
// double-entry invariant: for every asset, sum(credits) must equal sum(debits).
func NewTransaction(
	id kernel.ID,
	idempotencyKey string,
	txType TransactionType,
	entries []LedgerEntry,
	now time.Time,
) (*Transaction, error) {
	if strings.TrimSpace(idempotencyKey) == "" {
		return nil, kernel.NewDomainError(
			kernel.ModuleWallet,
			CodeUnbalancedTransaction,
			"idempotency key must not be empty",
		)
	}
	if len(entries) == 0 {
		return nil, kernel.NewDomainError(
			kernel.ModuleWallet,
			CodeUnbalancedTransaction,
			"transaction must have at least one ledger entry",
		)
	}

	if err := validateDoubleEntry(entries); err != nil {
		return nil, err
	}

	return &Transaction{
		ID:             id,
		IdempotencyKey: idempotencyKey,
		Type:           txType,
		Status:         TxStatusPending,
		Entries:        entries,
		CreatedAt:      now,
	}, nil
}

// Complete transitions the Transaction to Completed. Returns an error if already
// Completed or Reversed — completed transactions are immutable.
func (t *Transaction) Complete(now time.Time) error {
	if t.Status == TxStatusCompleted {
		return kernel.NewDomainError(
			kernel.ModuleWallet,
			CodeUnbalancedTransaction,
			"transaction is already completed",
		)
	}
	if t.Status == TxStatusReversed {
		return kernel.NewDomainError(
			kernel.ModuleWallet,
			CodeUnbalancedTransaction,
			"reversed transaction cannot be completed",
		)
	}
	t.Status = TxStatusCompleted
	t.CompletedAt = &now
	t.record(TransactionCompletedEvent{
		baseEvent:     baseEvent{aggregateID: t.ID, occurredAt: now},
		TransactionID: t.ID,
	})
	return nil
}

// Events returns uncommitted domain events.
func (t *Transaction) Events() []DomainEvent { return t.events }

// ClearEvents discards accumulated domain events after dispatch.
func (t *Transaction) ClearEvents() { t.events = nil }

func (t *Transaction) record(e DomainEvent) { t.events = append(t.events, e) }

// validateDoubleEntry enforces: for each asset, sum(credits) == sum(debits).
func validateDoubleEntry(entries []LedgerEntry) error {
	type balance struct {
		credits decimal.Decimal
		debits  decimal.Decimal
	}

	balances := make(map[kernel.AssetID]*balance)
	for _, e := range entries {
		b, ok := balances[e.AssetID]
		if !ok {
			b = &balance{}
			balances[e.AssetID] = b
		}
		switch e.Direction {
		case DirectionCredit:
			b.credits = b.credits.Add(e.Amount)
		case DirectionDebit:
			b.debits = b.debits.Add(e.Amount)
		}
	}

	for assetID, b := range balances {
		if !b.credits.Equal(b.debits) {
			return ErrUnbalancedTransaction(
				fmt.Sprintf(
					"asset %s: credits %s != debits %s",
					assetID, b.credits, b.debits,
				),
			)
		}
	}
	return nil
}
