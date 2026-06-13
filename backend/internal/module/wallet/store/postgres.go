package store

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	walletdb "github.com/imohammadali/arz-baran/backend/gen/sqlc/wallet"
	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// --------------------------------------------------------------------------
// PostgresRepository
// --------------------------------------------------------------------------

// PostgresRepository is the PostgreSQL implementation of wallet.store.Repository.
// It wraps a *walletdb.Queries so it can operate on either a pool connection or
// a pgx.Tx via WithTx.
type PostgresRepository struct {
	q *walletdb.Queries
}

// NewPostgresRepository constructs a repository backed by the shared pool.
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{q: walletdb.New(pool)}
}

// WithTx returns a Repository that executes all queries within tx.
func (r *PostgresRepository) WithTx(tx pgx.Tx) Repository {
	return &PostgresRepository{q: r.q.WithTx(tx)}
}

// --------------------------------------------------------------------------
// Account
// --------------------------------------------------------------------------

func (r *PostgresRepository) GetOrCreateAccount(
	ctx context.Context,
	userID kernel.ID,
	assetID kernel.AssetID,
	accountType string,
) (*Account, error) {
	row, err := r.q.GetOrCreateAccount(ctx, walletdb.GetOrCreateAccountParams{
		UserID:      userID,
		AssetID:     string(assetID),
		AccountType: accountType,
	})
	if err != nil {
		return nil, fmt.Errorf("wallet store: get-or-create account: %w", err)
	}
	return mapAccount(row), nil
}

func (r *PostgresRepository) LockAccountForUpdate(
	ctx context.Context,
	accountID kernel.ID,
) (*Account, error) {
	row, err := r.q.LockAccountForUpdate(ctx, accountID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("wallet store: lock account: %w", err)
	}
	return mapAccount(row), nil
}

// --------------------------------------------------------------------------
// Balance
// --------------------------------------------------------------------------

func (r *PostgresRepository) GetAvailableBalance(
	ctx context.Context,
	accountID kernel.ID,
	assetID kernel.AssetID,
) (decimal.Decimal, error) {
	s, err := r.q.GetAvailableBalance(ctx, walletdb.GetAvailableBalanceParams{
		AccountID: accountID,
		AssetID:   string(assetID),
	})
	if err != nil {
		return decimal.Zero, fmt.Errorf("wallet store: get available balance: %w", err)
	}
	d, err := decimal.NewFromString(s)
	if err != nil {
		return decimal.Zero, fmt.Errorf("wallet store: parse balance %q: %w", s, err)
	}
	return d, nil
}

// --------------------------------------------------------------------------
// Hold
// --------------------------------------------------------------------------

func (r *PostgresRepository) InsertHold(ctx context.Context, p InsertHoldParams) (*Hold, error) {
	num, err := decimalToNumeric(p.Amount)
	if err != nil {
		return nil, fmt.Errorf("wallet store: insert hold amount: %w", err)
	}
	row, err := r.q.InsertHold(ctx, walletdb.InsertHoldParams{
		ID:             p.ID,
		AccountID:      p.AccountID,
		Amount:         num,
		AssetID:        string(p.AssetID),
		IdempotencyKey: p.IdempotencyKey,
	})
	if err != nil {
		return nil, fmt.Errorf("wallet store: insert hold: %w", err)
	}
	return mapHold(row)
}

func (r *PostgresRepository) GetHold(ctx context.Context, holdID kernel.ID) (*Hold, error) {
	row, err := r.q.GetHold(ctx, holdID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("wallet store: get hold: %w", err)
	}
	return mapHold(row)
}

func (r *PostgresRepository) GetHoldByIdempotencyKey(ctx context.Context, key string) (*Hold, error) {
	row, err := r.q.GetHoldByIdempotencyKey(ctx, key)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("wallet store: get hold by idempotency key: %w", err)
	}
	return mapHold(row)
}

func (r *PostgresRepository) ReleaseHold(ctx context.Context, holdID kernel.ID) (*Hold, error) {
	row, err := r.q.ReleaseHold(ctx, holdID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("wallet store: release hold: %w", err)
	}
	return mapHold(row)
}

func (r *PostgresRepository) SettleHold(ctx context.Context, holdID kernel.ID) (*Hold, error) {
	row, err := r.q.SettleHold(ctx, holdID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("wallet store: settle hold: %w", err)
	}
	return mapHold(row)
}

// --------------------------------------------------------------------------
// Transaction
// --------------------------------------------------------------------------

func (r *PostgresRepository) InsertTransaction(
	ctx context.Context,
	p InsertTransactionParams,
) (*Transaction, error) {
	row, err := r.q.InsertTransaction(ctx, walletdb.InsertTransactionParams{
		ID:             p.ID,
		IdempotencyKey: p.IdempotencyKey,
		Type:           p.Type,
	})
	if err != nil {
		return nil, fmt.Errorf("wallet store: insert transaction: %w", err)
	}
	return mapTransaction(row), nil
}

func (r *PostgresRepository) CompleteTransaction(
	ctx context.Context,
	txID kernel.ID,
) (*Transaction, error) {
	row, err := r.q.CompleteTransaction(ctx, txID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("wallet store: complete transaction: %w", err)
	}
	return mapTransaction(row), nil
}

func (r *PostgresRepository) GetTransactionByIdempotencyKey(
	ctx context.Context,
	key string,
) (*Transaction, error) {
	row, err := r.q.GetTransactionByIdempotencyKey(ctx, key)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("wallet store: get transaction by idempotency key: %w", err)
	}
	return mapTransaction(row), nil
}

// --------------------------------------------------------------------------
// Ledger entry
// --------------------------------------------------------------------------

func (r *PostgresRepository) InsertLedgerEntry(
	ctx context.Context,
	p InsertLedgerEntryParams,
) error {
	num, err := decimalToNumeric(p.Amount)
	if err != nil {
		return fmt.Errorf("wallet store: insert ledger entry amount: %w", err)
	}
	_, err = r.q.InsertLedgerEntry(ctx, walletdb.InsertLedgerEntryParams{
		ID:            p.ID,
		TransactionID: p.TransactionID,
		AccountID:     p.AccountID,
		Direction:     p.Direction,
		Amount:        num,
		AssetID:       string(p.AssetID),
	})
	if err != nil {
		return fmt.Errorf("wallet store: insert ledger entry: %w", err)
	}
	return nil
}

// --------------------------------------------------------------------------
// Mapping helpers — sqlc models → store models
// --------------------------------------------------------------------------

func mapAccount(row walletdb.Account) *Account {
	return &Account{
		ID:          row.ID,
		UserID:      row.UserID,
		AssetID:     kernel.AssetID(row.AssetID),
		AccountType: row.AccountType,
		CreatedAt:   timestamptzToTime(row.CreatedAt),
	}
}

func mapHold(row walletdb.Hold) (*Hold, error) {
	amount, err := numericToDecimal(row.Amount)
	if err != nil {
		return nil, fmt.Errorf("wallet store: map hold amount: %w", err)
	}
	return &Hold{
		ID:             row.ID,
		AccountID:      row.AccountID,
		Amount:         amount,
		AssetID:        kernel.AssetID(row.AssetID),
		Status:         row.Status,
		IdempotencyKey: row.IdempotencyKey,
		CreatedAt:      timestamptzToTime(row.CreatedAt),
		UpdatedAt:      timestamptzToTime(row.UpdatedAt),
	}, nil
}

func mapTransaction(row walletdb.Transaction) *Transaction {
	return &Transaction{
		ID:             row.ID,
		IdempotencyKey: row.IdempotencyKey,
		Type:           row.Type,
		Status:         row.Status,
		CreatedAt:      timestamptzToTime(row.CreatedAt),
		CompletedAt:    nullTimestamptzToTimePtr(row.CompletedAt),
	}
}

// --------------------------------------------------------------------------
// Type conversion helpers
// --------------------------------------------------------------------------

// decimalToNumeric converts a decimal.Decimal to pgtype.Numeric by parsing
// the canonical string representation. This avoids any floating-point
// representation of the value.
func decimalToNumeric(d decimal.Decimal) (pgtype.Numeric, error) {
	var n pgtype.Numeric
	if err := n.Scan(d.String()); err != nil {
		return pgtype.Numeric{}, fmt.Errorf("decimalToNumeric(%s): %w", d, err)
	}
	return n, nil
}

// numericToDecimal converts a pgtype.Numeric to decimal.Decimal.
// pgtype.Numeric stores value as Int * 10^Exp where Int is a *big.Int.
// Returns decimal.Zero for NULL values.
func numericToDecimal(n pgtype.Numeric) (decimal.Decimal, error) {
	if !n.Valid {
		return decimal.Zero, nil
	}
	if n.NaN {
		return decimal.Zero, fmt.Errorf("numericToDecimal: value is NaN")
	}
	if n.InfinityModifier != pgtype.Finite {
		return decimal.Zero, fmt.Errorf("numericToDecimal: value is infinite")
	}
	if n.Int == nil {
		return decimal.Zero, nil
	}
	return decimal.NewFromBigInt(n.Int, int32(n.Exp)), nil
}

// anyNumericToDecimal converts the interface{} value returned by older sqlc
// queries that could not infer NUMERIC type. Handles pgtype.Numeric, string,
// and []byte representations.
func anyNumericToDecimal(v interface{}) (decimal.Decimal, error) {
	switch val := v.(type) {
	case pgtype.Numeric:
		return numericToDecimal(val)
	case *pgtype.Numeric:
		if val == nil {
			return decimal.Zero, nil
		}
		return numericToDecimal(*val)
	case string:
		return decimal.NewFromString(val)
	case []byte:
		return decimal.NewFromString(string(val))
	case *big.Int:
		return decimal.NewFromBigInt(val, 0), nil
	case nil:
		return decimal.Zero, nil
	default:
		return decimal.Zero, fmt.Errorf("anyNumericToDecimal: unsupported type %T", v)
	}
}

func timestamptzToTime(t pgtype.Timestamptz) time.Time {
	if !t.Valid {
		return time.Time{}
	}
	return t.Time
}

func nullTimestamptzToTimePtr(t pgtype.Timestamptz) *time.Time {
	if !t.Valid {
		return nil
	}
	cp := t.Time
	return &cp
}

var _ Repository = (*PostgresRepository)(nil)
