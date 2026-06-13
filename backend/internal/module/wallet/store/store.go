// Package store defines the wallet persistence port and its store-layer types.
// sqlc-generated models (gen/sqlc/wallet) are internal to postgres.go and
// must never leak beyond this package.
package store

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// --------------------------------------------------------------------------
// Store-layer models
// --------------------------------------------------------------------------

// Account is the store representation of a ledger account.
// It uses domain types so callers never see pgtype or uuid.UUID directly.
type Account struct {
	ID          kernel.ID
	UserID      kernel.ID
	AssetID     kernel.AssetID
	AccountType string
	CreatedAt   time.Time
}

// Hold is the store representation of a balance reservation.
type Hold struct {
	ID             kernel.ID
	AccountID      kernel.ID
	Amount         decimal.Decimal
	AssetID        kernel.AssetID
	Status         string
	IdempotencyKey string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// Transaction is the store representation of a financial transaction record.
type Transaction struct {
	ID             kernel.ID
	IdempotencyKey string
	Type           string
	Status         string
	CreatedAt      time.Time
	CompletedAt    *time.Time
}

// --------------------------------------------------------------------------
// Command params
// --------------------------------------------------------------------------

// InsertHoldParams carries all fields required to insert a new Hold row.
type InsertHoldParams struct {
	ID             kernel.ID
	AccountID      kernel.ID
	Amount         decimal.Decimal
	AssetID        kernel.AssetID
	IdempotencyKey string
}

// InsertTransactionParams carries all fields required to insert a Transaction row.
type InsertTransactionParams struct {
	ID             kernel.ID
	IdempotencyKey string
	Type           string
}

// InsertLedgerEntryParams carries all fields required to insert a LedgerEntry row.
type InsertLedgerEntryParams struct {
	ID            kernel.ID
	TransactionID kernel.ID
	AccountID     kernel.ID
	Direction     string
	Amount        decimal.Decimal
	AssetID       kernel.AssetID
}

// --------------------------------------------------------------------------
// Repository port
// --------------------------------------------------------------------------

// Repository is the wallet persistence port.
// Implementations must be safe for concurrent use by multiple goroutines.
//
// Error contract:
//   - pgx.ErrNoRows on a lookup (Get*) returns (nil, nil) — the caller
//     decides whether the absence is an error.
//   - pgx.ErrNoRows on a conditional update (ReleaseHold, SettleHold,
//     CompleteTransaction) also returns (nil, nil) — the row was not in the
//     expected state, and the caller handles that case.
//   - All other errors are wrapped and returned as-is.
type Repository interface {
	// WithTx returns a new Repository that executes all operations within tx.
	// The caller is responsible for committing or rolling back the transaction.
	WithTx(tx pgx.Tx) Repository

	// Account operations

	// GetOrCreateAccount returns the existing account matching (userID, assetID,
	// accountType), or inserts a new one. Safe under concurrent callers due to
	// the ON CONFLICT clause.
	GetOrCreateAccount(ctx context.Context, userID kernel.ID, assetID kernel.AssetID, accountType string) (*Account, error)

	// LockAccountForUpdate acquires a row-level lock on the account row for the
	// duration of the enclosing database transaction. Must be called inside a
	// transaction obtained via WithTx. Used to serialize hold placement and
	// prevent concurrent overdraft.
	LockAccountForUpdate(ctx context.Context, accountID kernel.ID) (*Account, error)

	// Balance

	// GetAvailableBalance returns the posted balance for the account, derived as
	// SUM(credits) − SUM(debits) across all ledger_entries rows. Active holds
	// are NOT subtracted here; the service layer is responsible for computing
	// the effective available balance.
	GetAvailableBalance(ctx context.Context, accountID kernel.ID, assetID kernel.AssetID) (decimal.Decimal, error)

	// GetActiveHoldsSum returns the total amount reserved by active holds for
	// the account+asset pair. Call this alongside GetAvailableBalance (both
	// inside the same transaction after LockAccountForUpdate) to compute the
	// true spendable balance: spendable = posted_balance − active_holds_sum.
	GetActiveHoldsSum(ctx context.Context, accountID kernel.ID, assetID kernel.AssetID) (decimal.Decimal, error)

	// Hold operations

	// InsertHold persists a new active Hold row. Returns
	// pgconn.PgError with Code "23505" (unique_violation) if the
	// idempotency key already exists.
	InsertHold(ctx context.Context, p InsertHoldParams) (*Hold, error)

	// GetHold looks up a Hold by its primary key.
	// Returns (nil, nil) if not found.
	GetHold(ctx context.Context, holdID kernel.ID) (*Hold, error)

	// GetHoldByIdempotencyKey looks up a Hold by its idempotency key.
	// Returns (nil, nil) if not found.
	GetHoldByIdempotencyKey(ctx context.Context, key string) (*Hold, error)

	// ReleaseHold transitions an active Hold to released.
	// Returns (nil, nil) if the hold does not exist or is not in active state.
	ReleaseHold(ctx context.Context, holdID kernel.ID) (*Hold, error)

	// SettleHold transitions an active Hold to settled.
	// Returns (nil, nil) if the hold does not exist or is not in active state.
	SettleHold(ctx context.Context, holdID kernel.ID) (*Hold, error)

	// Transaction operations

	// InsertTransaction persists a new pending Transaction row.
	InsertTransaction(ctx context.Context, p InsertTransactionParams) (*Transaction, error)

	// CompleteTransaction marks a pending Transaction as completed.
	// Returns (nil, nil) if the transaction is not in pending state.
	CompleteTransaction(ctx context.Context, txID kernel.ID) (*Transaction, error)

	// GetTransactionByIdempotencyKey looks up a Transaction by its idempotency key.
	// Returns (nil, nil) if not found.
	GetTransactionByIdempotencyKey(ctx context.Context, key string) (*Transaction, error)

	// Ledger entry operations

	// InsertLedgerEntry appends an immutable LedgerEntry row to the ledger.
	InsertLedgerEntry(ctx context.Context, p InsertLedgerEntryParams) error
}
