//go:build integration

package store_test

import (
	"context"
	"fmt"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	"github.com/imohammadali/arz-baran/backend/internal/module/wallet/store"
)

// --------------------------------------------------------------------------
// Test infrastructure
// --------------------------------------------------------------------------

func newTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://exchange:change-me@localhost:5433/exchange?sslmode=disable"
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("connect to test DB: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func newRepo(t *testing.T) store.Repository {
	t.Helper()
	return store.NewPostgresRepository(newTestPool(t))
}

// cleanupHolds deletes test holds inserted during a test.
func cleanupHolds(t *testing.T, pool *pgxpool.Pool, holdIDs ...kernel.ID) {
	t.Helper()
	for _, id := range holdIDs {
		_, _ = pool.Exec(context.Background(), `DELETE FROM holds WHERE id = $1`, id)
	}
}

// cleanupAccounts deletes test accounts (and any child holds/entries).
func cleanupAccount(t *testing.T, pool *pgxpool.Pool, accountID kernel.ID) {
	t.Helper()
	ctx := context.Background()
	_, _ = pool.Exec(ctx, `DELETE FROM holds WHERE account_id = $1`, accountID)
	_, _ = pool.Exec(ctx, `DELETE FROM ledger_entries WHERE account_id = $1`, accountID)
	_, _ = pool.Exec(ctx, `DELETE FROM accounts WHERE id = $1`, accountID)
}

func cleanupTransaction(t *testing.T, pool *pgxpool.Pool, txID kernel.ID) {
	t.Helper()
	ctx := context.Background()
	_, _ = pool.Exec(ctx, `DELETE FROM ledger_entries WHERE transaction_id = $1`, txID)
	_, _ = pool.Exec(ctx, `DELETE FROM transactions WHERE id = $1`, txID)
}

// creditAccount inserts a direct credit ledger entry so the account has a
// known posted balance.  Bypasses the service layer — test setup only.
func creditAccount(
	t *testing.T,
	pool *pgxpool.Pool,
	accountID kernel.ID,
	assetID kernel.AssetID,
	amount decimal.Decimal,
) (txID kernel.ID) {
	t.Helper()
	ctx := context.Background()
	txID = kernel.NewID()
	entryID := kernel.NewID()
	ikey := fmt.Sprintf("test-credit-%s", txID)

	_, err := pool.Exec(ctx,
		`INSERT INTO transactions (id, idempotency_key, type, status, completed_at)
		 VALUES ($1, $2, 'deposit', 'completed', NOW())`,
		txID, ikey)
	if err != nil {
		t.Fatalf("creditAccount: insert tx: %v", err)
	}

	_, err = pool.Exec(ctx,
		`INSERT INTO ledger_entries (id, transaction_id, account_id, direction, amount, asset_id)
		 VALUES ($1, $2, $3, 'credit', $4, $5)`,
		entryID, txID, accountID, amount.String(), string(assetID))
	if err != nil {
		t.Fatalf("creditAccount: insert entry: %v", err)
	}
	return txID
}

// --------------------------------------------------------------------------
// Account tests
// --------------------------------------------------------------------------

func TestGetOrCreateAccount_ReturnsConsistentID(t *testing.T) {
	pool := newTestPool(t)
	repo := store.NewPostgresRepository(pool)
	ctx := context.Background()
	userID := kernel.NewID()

	a1, err := repo.GetOrCreateAccount(ctx, userID, "BTC", "user")
	if err != nil || a1 == nil {
		t.Fatalf("first call: err=%v account=%v", err, a1)
	}

	// Second call with same params must return the same account.
	a2, err := repo.GetOrCreateAccount(ctx, userID, "BTC", "user")
	if err != nil || a2 == nil {
		t.Fatalf("second call: err=%v account=%v", err, a2)
	}
	if a1.ID != a2.ID {
		t.Errorf("expected same account ID: %v != %v", a1.ID, a2.ID)
	}

	// Different asset → different account.
	aOther, err := repo.GetOrCreateAccount(ctx, userID, "USDT", "user")
	if err != nil || aOther == nil {
		t.Fatalf("usdt call: err=%v", err)
	}
	if aOther.ID == a1.ID {
		t.Error("BTC and USDT accounts should not share an ID")
	}

	t.Cleanup(func() {
		cleanupAccount(t, pool, a1.ID)
		cleanupAccount(t, pool, aOther.ID)
	})
}

// --------------------------------------------------------------------------
// Balance tests
// --------------------------------------------------------------------------

func TestGetAvailableBalance_EmptyAccount(t *testing.T) {
	pool := newTestPool(t)
	repo := store.NewPostgresRepository(pool)
	ctx := context.Background()
	userID := kernel.NewID()

	acc, err := repo.GetOrCreateAccount(ctx, userID, "BTC", "user")
	if err != nil {
		t.Fatalf("create account: %v", err)
	}
	t.Cleanup(func() { cleanupAccount(t, pool, acc.ID) })

	bal, err := repo.GetAvailableBalance(ctx, acc.ID, "BTC")
	if err != nil {
		t.Fatalf("GetAvailableBalance: %v", err)
	}
	if !bal.IsZero() {
		t.Errorf("expected zero balance for new account, got %s", bal)
	}
}

func TestGetAvailableBalance_ReflectsLedgerEntries(t *testing.T) {
	pool := newTestPool(t)
	repo := store.NewPostgresRepository(pool)
	ctx := context.Background()
	userID := kernel.NewID()

	acc, _ := repo.GetOrCreateAccount(ctx, userID, "BTC", "user")
	credit := decimal.NewFromFloat(1.5)
	txID := creditAccount(t, pool, acc.ID, "BTC", credit)

	t.Cleanup(func() {
		cleanupTransaction(t, pool, txID)
		cleanupAccount(t, pool, acc.ID)
	})

	bal, err := repo.GetAvailableBalance(ctx, acc.ID, "BTC")
	if err != nil {
		t.Fatalf("GetAvailableBalance: %v", err)
	}
	if !bal.Equal(credit) {
		t.Errorf("expected balance=%s, got=%s", credit, bal)
	}
}

func TestGetActiveHoldsSum_ZeroWithNoHolds(t *testing.T) {
	pool := newTestPool(t)
	repo := store.NewPostgresRepository(pool)
	ctx := context.Background()
	userID := kernel.NewID()

	acc, _ := repo.GetOrCreateAccount(ctx, userID, "BTC", "user")
	t.Cleanup(func() { cleanupAccount(t, pool, acc.ID) })

	sum, err := repo.GetActiveHoldsSum(ctx, acc.ID, "BTC")
	if err != nil {
		t.Fatalf("GetActiveHoldsSum: %v", err)
	}
	if !sum.IsZero() {
		t.Errorf("expected zero holds sum, got %s", sum)
	}
}

// --------------------------------------------------------------------------
// Hold lifecycle tests
// --------------------------------------------------------------------------

func TestHold_InsertGetRelease(t *testing.T) {
	pool := newTestPool(t)
	repo := store.NewPostgresRepository(pool)
	ctx := context.Background()
	userID := kernel.NewID()

	acc, _ := repo.GetOrCreateAccount(ctx, userID, "BTC", "user")
	t.Cleanup(func() { cleanupAccount(t, pool, acc.ID) })

	holdID := kernel.NewID()
	amount := decimal.NewFromFloat(0.5)
	ikey := fmt.Sprintf("test-hold-%s", holdID)

	// Insert
	h, err := repo.InsertHold(ctx, store.InsertHoldParams{
		ID:             holdID,
		AccountID:      acc.ID,
		Amount:         amount,
		AssetID:        "BTC",
		IdempotencyKey: ikey,
	})
	if err != nil || h == nil {
		t.Fatalf("InsertHold: err=%v h=%v", err, h)
	}
	if h.Status != "active" {
		t.Errorf("expected status=active, got=%s", h.Status)
	}
	if !h.Amount.Equal(amount) {
		t.Errorf("amount mismatch: want=%s got=%s", amount, h.Amount)
	}

	// GetHold
	fetched, err := repo.GetHold(ctx, holdID)
	if err != nil || fetched == nil {
		t.Fatalf("GetHold: err=%v h=%v", err, fetched)
	}
	if fetched.ID != holdID {
		t.Errorf("ID mismatch: want=%v got=%v", holdID, fetched.ID)
	}

	// GetHoldByIdempotencyKey
	byKey, err := repo.GetHoldByIdempotencyKey(ctx, ikey)
	if err != nil || byKey == nil {
		t.Fatalf("GetHoldByIdempotencyKey: err=%v h=%v", err, byKey)
	}

	// Active holds sum reflects the inserted hold
	sum, _ := repo.GetActiveHoldsSum(ctx, acc.ID, "BTC")
	if !sum.Equal(amount) {
		t.Errorf("active holds sum: want=%s got=%s", amount, sum)
	}

	// Release
	released, err := repo.ReleaseHold(ctx, holdID)
	if err != nil || released == nil {
		t.Fatalf("ReleaseHold: err=%v h=%v", err, released)
	}
	if released.Status != "released" {
		t.Errorf("expected status=released, got=%s", released.Status)
	}

	// Active holds sum is zero after release
	sum, _ = repo.GetActiveHoldsSum(ctx, acc.ID, "BTC")
	if !sum.IsZero() {
		t.Errorf("active holds sum after release: want=0 got=%s", sum)
	}
}

func TestHold_ReleaseNonActive_ReturnsNilNil(t *testing.T) {
	pool := newTestPool(t)
	repo := store.NewPostgresRepository(pool)
	ctx := context.Background()
	userID := kernel.NewID()

	acc, _ := repo.GetOrCreateAccount(ctx, userID, "BTC", "user")
	t.Cleanup(func() { cleanupAccount(t, pool, acc.ID) })

	holdID := kernel.NewID()
	_, _ = repo.InsertHold(ctx, store.InsertHoldParams{
		ID: holdID, AccountID: acc.ID,
		Amount: decimal.NewFromFloat(1), AssetID: "BTC",
		IdempotencyKey: fmt.Sprintf("test-rel-%s", holdID),
	})
	_, _ = repo.ReleaseHold(ctx, holdID) // first release: succeeds

	// Second release: hold is no longer active → nil, nil
	result, err := repo.ReleaseHold(ctx, holdID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != nil {
		t.Errorf("expected nil for already-released hold, got %+v", result)
	}
}

func TestHold_Settle(t *testing.T) {
	pool := newTestPool(t)
	repo := store.NewPostgresRepository(pool)
	ctx := context.Background()
	userID := kernel.NewID()

	acc, _ := repo.GetOrCreateAccount(ctx, userID, "BTC", "user")
	t.Cleanup(func() { cleanupAccount(t, pool, acc.ID) })

	holdID := kernel.NewID()
	_, _ = repo.InsertHold(ctx, store.InsertHoldParams{
		ID: holdID, AccountID: acc.ID,
		Amount: decimal.NewFromFloat(0.25), AssetID: "BTC",
		IdempotencyKey: fmt.Sprintf("test-settle-%s", holdID),
	})

	settled, err := repo.SettleHold(ctx, holdID)
	if err != nil || settled == nil {
		t.Fatalf("SettleHold: err=%v h=%v", err, settled)
	}
	if settled.Status != "settled" {
		t.Errorf("expected status=settled, got=%s", settled.Status)
	}

	// Settling again → nil, nil
	result, err := repo.SettleHold(ctx, holdID)
	if err != nil {
		t.Fatalf("unexpected error on second settle: %v", err)
	}
	if result != nil {
		t.Errorf("expected nil for already-settled hold")
	}
}

func TestGetHold_NotFound_ReturnsNilNil(t *testing.T) {
	repo := newRepo(t)
	result, err := repo.GetHold(context.Background(), kernel.NewID())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != nil {
		t.Errorf("expected nil for missing hold, got %+v", result)
	}
}

// --------------------------------------------------------------------------
// Transaction + LedgerEntry tests
// --------------------------------------------------------------------------

func TestTransaction_InsertAndComplete(t *testing.T) {
	pool := newTestPool(t)
	repo := store.NewPostgresRepository(pool)
	ctx := context.Background()
	userID := kernel.NewID()

	srcAcc, _ := repo.GetOrCreateAccount(ctx, userID, "BTC", "user")
	dstAcc, _ := repo.GetOrCreateAccount(ctx, userID, "BTC", "fee")
	t.Cleanup(func() {
		cleanupAccount(t, pool, srcAcc.ID)
		cleanupAccount(t, pool, dstAcc.ID)
	})

	txID := kernel.NewID()
	ikey := fmt.Sprintf("test-tx-%s", txID)
	t.Cleanup(func() { cleanupTransaction(t, pool, txID) })

	// Insert pending transaction
	tx, err := repo.InsertTransaction(ctx, store.InsertTransactionParams{
		ID: txID, IdempotencyKey: ikey, Type: "deposit",
	})
	if err != nil || tx == nil {
		t.Fatalf("InsertTransaction: err=%v", err)
	}
	if tx.Status != "pending" {
		t.Errorf("expected status=pending, got=%s", tx.Status)
	}
	if tx.CompletedAt != nil {
		t.Error("CompletedAt should be nil for pending transaction")
	}

	// GetTransactionByIdempotencyKey
	found, err := repo.GetTransactionByIdempotencyKey(ctx, ikey)
	if err != nil || found == nil {
		t.Fatalf("GetTransactionByIdempotencyKey: err=%v", err)
	}
	if found.ID != txID {
		t.Errorf("ID mismatch: want=%v got=%v", txID, found.ID)
	}

	amount := decimal.NewFromFloat(1.0)

	// Insert balanced ledger entries (debit src, credit dst)
	if err := repo.InsertLedgerEntry(ctx, store.InsertLedgerEntryParams{
		ID: kernel.NewID(), TransactionID: txID,
		AccountID: srcAcc.ID, Direction: "debit",
		Amount: amount, AssetID: "BTC",
	}); err != nil {
		t.Fatalf("InsertLedgerEntry debit: %v", err)
	}
	if err := repo.InsertLedgerEntry(ctx, store.InsertLedgerEntryParams{
		ID: kernel.NewID(), TransactionID: txID,
		AccountID: dstAcc.ID, Direction: "credit",
		Amount: amount, AssetID: "BTC",
	}); err != nil {
		t.Fatalf("InsertLedgerEntry credit: %v", err)
	}

	// Complete the transaction
	completed, err := repo.CompleteTransaction(ctx, txID)
	if err != nil || completed == nil {
		t.Fatalf("CompleteTransaction: err=%v", err)
	}
	if completed.Status != "completed" {
		t.Errorf("expected status=completed, got=%s", completed.Status)
	}
	if completed.CompletedAt == nil {
		t.Error("CompletedAt should be set after completion")
	}

	// CompleteTransaction a second time → nil, nil (idempotent)
	again, err := repo.CompleteTransaction(ctx, txID)
	if err != nil {
		t.Fatalf("unexpected error on second complete: %v", err)
	}
	if again != nil {
		t.Errorf("expected nil for already-completed tx")
	}
}

func TestGetTransactionByIdempotencyKey_NotFound(t *testing.T) {
	repo := newRepo(t)
	result, err := repo.GetTransactionByIdempotencyKey(context.Background(), "nonexistent-key")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != nil {
		t.Errorf("expected nil, got %+v", result)
	}
}

// --------------------------------------------------------------------------
// WithTx test
// --------------------------------------------------------------------------

func TestWithTx_RollbackUndoesInsert(t *testing.T) {
	pool := newTestPool(t)
	repo := store.NewPostgresRepository(pool)
	ctx := context.Background()
	userID := kernel.NewID()

	acc, _ := repo.GetOrCreateAccount(ctx, userID, "BTC", "user")
	t.Cleanup(func() { cleanupAccount(t, pool, acc.ID) })

	holdID := kernel.NewID()
	ikey := fmt.Sprintf("test-rollback-%s", holdID)

	// Begin a transaction, insert hold, then ROLL BACK.
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	txRepo := repo.WithTx(tx)
	_, err = txRepo.InsertHold(ctx, store.InsertHoldParams{
		ID: holdID, AccountID: acc.ID,
		Amount: decimal.NewFromFloat(1), AssetID: "BTC",
		IdempotencyKey: ikey,
	})
	if err != nil {
		_ = tx.Rollback(ctx)
		t.Fatalf("InsertHold inside tx: %v", err)
	}
	_ = tx.Rollback(ctx) // intentional rollback

	// Hold must not exist after rollback.
	result, err := repo.GetHold(ctx, holdID)
	if err != nil {
		t.Fatalf("GetHold after rollback: %v", err)
	}
	if result != nil {
		t.Errorf("hold should not exist after rollback, got status=%s", result.Status)
	}
}

func TestWithTx_LockAccountForUpdate_Serializes(t *testing.T) {
	pool := newTestPool(t)
	repo := store.NewPostgresRepository(pool)
	ctx := context.Background()
	userID := kernel.NewID()

	acc, _ := repo.GetOrCreateAccount(ctx, userID, "BTC", "user")
	t.Cleanup(func() { cleanupAccount(t, pool, acc.ID) })

	// TX1 locks the account row.
	tx1, _ := pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	txRepo1 := repo.WithTx(tx1)
	_, err := txRepo1.LockAccountForUpdate(ctx, acc.ID)
	if err != nil {
		_ = tx1.Rollback(ctx)
		t.Fatalf("LockAccountForUpdate tx1: %v", err)
	}

	// TX2 tries to lock the same row with a short timeout.
	lockBlocked := make(chan bool, 1)
	go func() {
		lockCtx, cancel := context.WithTimeout(ctx, 200*time.Millisecond)
		defer cancel()
		tx2, _ := pool.BeginTx(lockCtx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
		txRepo2 := repo.WithTx(tx2)
		_, err := txRepo2.LockAccountForUpdate(lockCtx, acc.ID)
		// Must be blocked (context deadline) because TX1 holds the lock.
		lockBlocked <- (err != nil)
		_ = tx2.Rollback(ctx)
	}()

	// TX1 holds the lock for 300ms, which is longer than TX2's timeout.
	time.Sleep(300 * time.Millisecond)
	_ = tx1.Rollback(ctx)

	wasBlocked := <-lockBlocked
	if !wasBlocked {
		t.Error("expected TX2 to be blocked by TX1's FOR UPDATE lock")
	}
}

// --------------------------------------------------------------------------
// Concurrent overdraft prevention test (THE most important test)
// --------------------------------------------------------------------------

// TestConcurrentHoldPlacement_NeverOverdraft simulates the service-layer
// hold-placement pattern under concurrency:
//
//  1. Acquire an account row lock  (LockAccountForUpdate)
//  2. Read posted balance           (GetAvailableBalance)
//  3. Read active holds sum         (GetActiveHoldsSum)
//  4. Check spendable = posted - holds ≥ requested amount
//  5. Insert hold if ok
//  6. Commit
//
// With correct locking only the goroutines whose sum fits within the balance
// succeed. The invariant sum(active_holds) ≤ posted_balance must always hold.
func TestConcurrentHoldPlacement_NeverOverdraft(t *testing.T) {
	pool := newTestPool(t)
	repo := store.NewPostgresRepository(pool)
	ctx := context.Background()
	userID := kernel.NewID()

	acc, _ := repo.GetOrCreateAccount(ctx, userID, "BTC", "user")
	postedBalance := decimal.NewFromFloat(100)
	txID := creditAccount(t, pool, acc.ID, "BTC", postedBalance)

	t.Cleanup(func() {
		cleanupTransaction(t, pool, txID)
		cleanupAccount(t, pool, acc.ID)
	})

	const goroutines = 10
	holdAmount := decimal.NewFromFloat(60) // each wants 60; only 1 can fit in 100

	var (
		successCount atomic.Int32
		failCount    atomic.Int32
		wg           sync.WaitGroup
		mu           sync.Mutex // protects hold ID list for cleanup
		insertedIDs  []kernel.ID
	)

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()

			holdID := kernel.NewID()
			ikey := fmt.Sprintf("concurrent-hold-%v-%d", holdID, idx)

			dbTx, err := pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
			if err != nil {
				failCount.Add(1)
				return
			}

			txRepo := repo.WithTx(dbTx)

			// Step 1: Lock account row — serialization gate.
			if _, err := txRepo.LockAccountForUpdate(ctx, acc.ID); err != nil {
				_ = dbTx.Rollback(ctx)
				failCount.Add(1)
				return
			}

			// Step 2+3: Compute spendable balance.
			posted, err := txRepo.GetAvailableBalance(ctx, acc.ID, "BTC")
			if err != nil {
				_ = dbTx.Rollback(ctx)
				failCount.Add(1)
				return
			}
			holdsSum, err := txRepo.GetActiveHoldsSum(ctx, acc.ID, "BTC")
			if err != nil {
				_ = dbTx.Rollback(ctx)
				failCount.Add(1)
				return
			}
			spendable := posted.Sub(holdsSum)

			// Step 4: Check.
			if holdAmount.GreaterThan(spendable) {
				_ = dbTx.Rollback(ctx)
				failCount.Add(1)
				return
			}

			// Step 5: Insert hold.
			h, err := txRepo.InsertHold(ctx, store.InsertHoldParams{
				ID:             holdID,
				AccountID:      acc.ID,
				Amount:         holdAmount,
				AssetID:        "BTC",
				IdempotencyKey: ikey,
			})
			if err != nil || h == nil {
				_ = dbTx.Rollback(ctx)
				failCount.Add(1)
				return
			}

			if err := dbTx.Commit(ctx); err != nil {
				failCount.Add(1)
				return
			}

			successCount.Add(1)
			mu.Lock()
			insertedIDs = append(insertedIDs, holdID)
			mu.Unlock()
		}(i)
	}

	wg.Wait()

	t.Cleanup(func() { cleanupHolds(t, pool, insertedIDs...) })

	t.Logf("goroutines=%d success=%d fail=%d", goroutines, successCount.Load(), failCount.Load())

	// Only 1 hold of 60 can fit into a balance of 100.
	if successCount.Load() != 1 {
		t.Errorf("expected exactly 1 successful hold (60 fits in 100), got %d", successCount.Load())
	}
	if failCount.Load() != goroutines-1 {
		t.Errorf("expected %d failures, got %d", goroutines-1, failCount.Load())
	}

	// Final invariant: active holds ≤ posted balance.
	finalHoldsSum, err := repo.GetActiveHoldsSum(ctx, acc.ID, "BTC")
	if err != nil {
		t.Fatalf("final GetActiveHoldsSum: %v", err)
	}
	if finalHoldsSum.GreaterThan(postedBalance) {
		t.Errorf("OVERDRAFT DETECTED: holds=%s > balance=%s", finalHoldsSum, postedBalance)
	}
	t.Logf("final active holds sum = %s (balance = %s)", finalHoldsSum, postedBalance)
}
