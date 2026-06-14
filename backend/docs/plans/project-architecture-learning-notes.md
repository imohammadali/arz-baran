# Project Architecture Learning Notes

This document explains the current backend project architecture and flow for someone who is new to Go, PostgreSQL, and this codebase.

## 1. What This Project Is

This backend is being built as the core of a crypto and online gold exchange.

A real exchange backend is not just a normal CRUD API. It must handle money safely.

The most important responsibilities are:

- Users and identity
- Assets like `BTC`, `USDT`, `IRT`, gold
- Wallets and balances
- Double-entry accounting ledger
- Holds, locked balances, and settlement
- Trading orders
- Matching engine later
- Market data later
- Admin and audit later
- Blockchain integration later

Right now, the project is still in the early backend phases. The most important work currently is the wallet and ledger foundation.

## 2. Big Architecture Picture

The project uses a modular monolith architecture.

That means the app runs as one backend process, but the code is split into modules:

```text
backend/
  cmd/
    api/
      main.go
      app/
        app.go

  internal/
    kernel/
    platform/
    module/
      iam/
      instrument/
      wallet/
      trading/
```

The modules are:

```text
iam         user identity and authentication
instrument assets and trading pairs
wallet     accounts, ledger, holds, balances
trading    orders and trades
```

This is a good architecture for a real MVP because it avoids starting with too many microservices too early.

## 3. Application Startup Flow

The main application wiring happens in `cmd/api/app/app.go`.

In simple terms, startup does this:

```text
1. Load config from environment variables
2. Create logger
3. Run database migrations
4. Connect to PostgreSQL
5. Connect to Redis
6. Create modules: IAM, Instrument, Wallet, Trading
7. Register HTTP routes
8. Start HTTP server
```

This file is called the composition root.

Composition root means:

```text
The place where all dependencies are connected together.
```

## 4. What Is `kernel`?

`internal/kernel` contains shared core types used by all modules.

Examples:

- `kernel.ID`
- `kernel.AssetID`
- `kernel.PairID`
- `kernel.Money`
- shared error types

Why do we need this?

Because many modules need the same basic concepts. For example, both wallet and trading need to know what an asset is.

In this project, IDs are UUIDs. Money uses `decimal.Decimal`, not `float64`.

That is very important.

In financial systems:

```text
Never use float64 for money.
```

Floating point numbers can create rounding errors, which are unacceptable for financial systems.

## 5. What Is `platform`?

`internal/platform` contains infrastructure code.

Examples:

```text
config      loads environment variables
logger      structured logging
httpx       HTTP server setup and error mapping
postgres    PostgreSQL connection pool
redis       Redis client
migrate     database migrations
module      shared module interface
clock       time abstraction
```

Platform code is not business logic. It supports the application.

## 6. What Is a Module?

Each business area is a module.

For example:

```text
internal/module/wallet/
  api/
  domain/
  service/
  store/
  handler/
  module.go
```

The meaning of each folder:

```text
api      interface exposed to other modules
domain   pure business rules and entities
service  application use cases
store    database access
handler  HTTP handlers
module.go wiring for this module
```

This pattern is repeated for `iam`, `instrument`, `wallet`, and `trading`.

## 7. Current Important Module: Wallet

The wallet module is currently the most important module because it will become the financial core.

The wallet module handles:

```text
accounts
ledger entries
transactions
holds
available balance
settlement
```

The current wallet API is still old/stub-style and needs to be upgraded in the next step because `Amount` should be `decimal.Decimal`, not `string`, and the API should also expose `PostTransaction` and `GetAvailableBalance`.

## 8. What Is a Ledger?

A ledger is the accounting system.

Instead of storing a mutable balance like this:

```text
wallet.balance = 100
```

we store immutable records:

```text
ledger entry 1: credit user BTC account 100
ledger entry 2: debit system BTC account 100
```

This is called double-entry accounting.

The core rule is:

```text
sum(debits) == sum(credits)
```

The important idea:

```text
Balances are calculated from ledger entries.
Balances are not manually updated.
```

Project code:

File: `internal/module/wallet/domain/ledger.go`

```go
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
```

What each field means:

```text
ID:
  Unique ID of this ledger entry.

TransactionID:
  ID of the parent financial transaction.
  Multiple ledger entries belong to one transaction.

AccountID:
  The ledger account affected by this entry.

Direction:
  Either debit or credit.
  Direction gives the amount its accounting meaning.

Amount:
  Always positive.
  Never store negative ledger amounts.

AssetID:
  The asset being moved, such as BTC or USDT.

CreatedAt:
  Time this ledger entry was created.
```

Constructor:

```go
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
```

Why this constructor matters:

```text
It prevents zero or negative ledger entries.
That keeps the ledger accounting model clean:
amount is positive, direction decides debit or credit.
```

Double-entry validation:

```go
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
```

How to modify safely:

```text
Do not bypass NewTransaction or validateDoubleEntry.
Do not insert ledger entries directly from business logic without validation.
If you add a new transaction type, it must still balance per asset.
```

## 9. What Is a Hold?

A hold means reserved balance.

Example:

```text
User has 100 USDT.
User places an order requiring 30 USDT.
Available balance becomes 70.
Locked balance becomes 30.
Total balance remains 100.
```

Hold statuses:

```text
active    funds are reserved
released  reservation was cancelled
settled   reservation was consumed into a transaction
```

This matters for trading.

When a user places a buy order, the system should first place a hold on the user's quote asset, such as USDT.

Project code:

File: `internal/module/wallet/domain/hold.go`

```go
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
```

What each field means:

```text
ID:
  Unique ID of the hold.

AccountID:
  The account whose funds are being reserved.

Amount:
  The amount reserved.
  Must always be positive.

AssetID:
  The asset being reserved.
  Example: USDT for a buy order, BTC for a sell order.

Status:
  active, released, or settled.

IdempotencyKey:
  Prevents duplicate holds if the same request is retried.

CreatedAt / UpdatedAt:
  Timestamps for tracking lifecycle.

events:
  Domain events recorded by the aggregate.
  It is private because callers should not mutate events directly.
```

Constructor:

```go
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
```

Lifecycle methods:

```go
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
```

Important rule:

```text
Release:
  Cancels the reservation.
  Does not create ledger entries.

Settle:
  Consumes the reservation.
  Must be accompanied by ledger entries in the service layer.
```

## 10. What Has Been Implemented So Far?

So far, these major things are done:

### Foundation

- Config loading
- Logging
- HTTP server
- PostgreSQL connection
- Redis connection
- Goose migrations
- sqlc setup
- Modular monolith structure

### Domain Modeling

Domain models exist for:

```text
IAM
Instrument
Wallet/Ledger
Trading
```

### Database Migrations

Tables exist for:

```text
users
accounts
transactions
ledger_entries
holds
assets
trading_pairs
```

### Wallet Store Layer

The wallet store layer is the part recently implemented.

`store.go` now defines the persistence interface. This interface is important because the service layer will use it without knowing PostgreSQL details.

## 11. What Is a Repository?

A repository is a layer that hides database details.

Instead of service code writing SQL directly, it calls methods like:

```text
GetOrCreateAccount
InsertHold
InsertTransaction
InsertLedgerEntry
GetAvailableBalance
```

The repository then uses sqlc-generated code internally.

This keeps the architecture clean:

```text
service layer -> repository interface -> postgres implementation -> sqlc -> PostgreSQL
```

Project code:

File: `internal/module/wallet/store/store.go`

```go
// Repository is the wallet persistence port.
// Implementations must be safe for concurrent use by multiple goroutines.
type Repository interface {
	// WithTx returns a new Repository that executes all operations within tx.
	// The caller is responsible for committing or rolling back the transaction.
	WithTx(tx pgx.Tx) Repository

	// Account operations
	GetOrCreateAccount(ctx context.Context, userID kernel.ID, assetID kernel.AssetID, accountType string) (*Account, error)
	LockAccountForUpdate(ctx context.Context, accountID kernel.ID) (*Account, error)

	// Balance
	GetAvailableBalance(ctx context.Context, accountID kernel.ID, assetID kernel.AssetID) (decimal.Decimal, error)
	GetActiveHoldsSum(ctx context.Context, accountID kernel.ID, assetID kernel.AssetID) (decimal.Decimal, error)

	// Hold operations
	InsertHold(ctx context.Context, p InsertHoldParams) (*Hold, error)
	GetHold(ctx context.Context, holdID kernel.ID) (*Hold, error)
	GetHoldByIdempotencyKey(ctx context.Context, key string) (*Hold, error)
	ReleaseHold(ctx context.Context, holdID kernel.ID) (*Hold, error)
	SettleHold(ctx context.Context, holdID kernel.ID) (*Hold, error)

	// Transaction operations
	InsertTransaction(ctx context.Context, p InsertTransactionParams) (*Transaction, error)
	CompleteTransaction(ctx context.Context, txID kernel.ID) (*Transaction, error)
	GetTransactionByIdempotencyKey(ctx context.Context, key string) (*Transaction, error)

	// Ledger entry operations
	InsertLedgerEntry(ctx context.Context, p InsertLedgerEntryParams) error
}
```

Why this matters:

```text
The service layer depends on this interface, not directly on PostgreSQL.
That makes the service easier to test and keeps database code isolated.
```

How to modify safely:

```text
Add new persistence methods here only when the service layer really needs them.
Do not expose sqlc-generated types from this interface.
Keep money values as decimal.Decimal.
```

## 12. What Is sqlc?

`sqlc` is a tool that reads SQL files and generates Go code.

You write SQL manually:

```sql
-- name: GetOrCreateAccount :one
INSERT INTO accounts ...
RETURNING *;
```

Then sqlc generates a Go function like:

```go
GetOrCreateAccount(ctx, params)
```

Why use sqlc?

```text
You write real SQL.
Go code becomes type-safe.
You avoid hand-written row scanning everywhere.
```

## 13. PostgreSQL Store Implementation

`internal/module/wallet/store/postgres.go` implements the repository using generated sqlc code.

Important terms:

```text
pgxpool.Pool = PostgreSQL connection pool
pgx.Tx       = PostgreSQL transaction
```

A connection pool lets the app reuse database connections efficiently.

A transaction groups multiple database operations so they either all succeed or all fail.

Project code:

File: `internal/module/wallet/store/postgres.go`

```go
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
```

Example repository method:

```go
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
```

What happens here:

```text
1. Service calls store.GetOrCreateAccount.
2. Store calls sqlc-generated q.GetOrCreateAccount.
3. sqlc runs SQL against PostgreSQL.
4. Store maps the sqlc model into the clean store.Account type.
```

## 14. What Is `WithTx`?

`WithTx` means:

```text
Use this repository inside a database transaction.
```

Example flow in the future service:

```text
tx := pool.BeginTx(...)
txRepo := repo.WithTx(tx)

txRepo.GetOrCreateAccount(...)
txRepo.LockAccountForUpdate(...)
txRepo.InsertHold(...)

tx.Commit(...)
```

Why is this important?

Because financial operations must be atomic.

Atomic means:

```text
Either all steps happen, or none happen.
```

For example, when placing a hold:

```text
1. Lock account
2. Check available balance
3. Insert hold
```

These must happen together.

## 15. What Is `SELECT FOR UPDATE`?

`SELECT ... FOR UPDATE` means:

```text
Lock this account row until the transaction finishes.
```

Why?

Imagine a user has 100 USDT.

Two requests arrive at the same time:

```text
Request A wants to hold 80
Request B wants to hold 80
```

Without locking, both may see available balance = 100 and both succeed.

That creates:

```text
160 USDT held from only 100 USDT balance
```

That is an overdraft bug.

With `SELECT FOR UPDATE`, only one request can check and update the account at a time.

Project code:

File: `sql/queries/wallet/accounts.sql`

```sql
-- name: LockAccountForUpdate :one
SELECT id, user_id, asset_id, account_type, created_at
FROM accounts
WHERE id = $1
FOR UPDATE;
```

Repository method:

File: `internal/module/wallet/store/postgres.go`

```go
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
```

How it should be used:

```go
tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
if err != nil {
	return err
}
defer tx.Rollback(ctx)

txRepo := repo.WithTx(tx)

account, err := txRepo.GetOrCreateAccount(ctx, userID, assetID, "user")
if err != nil {
	return err
}

if _, err := txRepo.LockAccountForUpdate(ctx, account.ID); err != nil {
	return err
}

// Now it is safe to read balance and insert hold.
```

## 16. Current Issue: Available Balance Design

Right now there is a split:

```text
GetAvailableBalance = posted ledger balance
GetActiveHoldsSum = total active holds
```

This is not necessarily wrong if the service carefully does:

```text
postedBalance := GetAvailableBalance(...)
activeHolds := GetActiveHoldsSum(...)
spendable := postedBalance - activeHolds
```

But the naming is confusing.

A better naming would be:

```text
GetPostedBalance
GetActiveHoldsSum
GetAvailableBalance
```

Where:

```text
posted balance = ledger credits - ledger debits
available balance = posted balance - active holds
```

For now, the next service implementation must be careful to subtract holds before allowing a new hold.

Project code:

File: `sql/queries/wallet/accounts.sql`

Posted balance query:

```sql
-- name: GetAvailableBalance :one
SELECT COALESCE(
    SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END),
    0
)::text AS balance
FROM ledger_entries
WHERE account_id = $1 AND asset_id = $2;
```

Active holds query:

```sql
-- name: GetActiveHoldsSum :one
SELECT COALESCE(SUM(amount), 0)::text AS total
FROM holds
WHERE account_id = $1 AND asset_id = $2 AND status = 'active';
```

Repository methods:

File: `internal/module/wallet/store/postgres.go`

```go
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

func (r *PostgresRepository) GetActiveHoldsSum(
	ctx context.Context,
	accountID kernel.ID,
	assetID kernel.AssetID,
) (decimal.Decimal, error) {
	s, err := r.q.GetActiveHoldsSum(ctx, walletdb.GetActiveHoldsSumParams{
		AccountID: accountID,
		AssetID:   string(assetID),
	})
	if err != nil {
		return decimal.Zero, fmt.Errorf("wallet store: get active holds sum: %w", err)
	}
	d, err := decimal.NewFromString(s)
	if err != nil {
		return decimal.Zero, fmt.Errorf("wallet store: parse active holds sum %q: %w", s, err)
	}
	return d, nil
}
```

Correct service-level calculation:

```go
postedBalance, err := txRepo.GetAvailableBalance(ctx, account.ID, assetID)
if err != nil {
	return err
}

activeHolds, err := txRepo.GetActiveHoldsSum(ctx, account.ID, assetID)
if err != nil {
	return err
}

spendable := postedBalance.Sub(activeHolds)
```

Important warning:

```text
The method name GetAvailableBalance is currently misleading.
It returns posted ledger balance, not final spendable balance.
The service must subtract active holds before allowing a new hold.
```

## 17. What Are Store Integration Tests?

There is now an integration test file:

```text
internal/module/wallet/store/postgres_integration_test.go
```

It uses the build tag:

```go
//go:build integration
```

This means these tests do not run by default.

You run them with:

```bash
go test -tags integration ./internal/module/wallet/store/...
```

They need a real PostgreSQL database.

These tests are useful because repository behavior depends on real PostgreSQL features like:

```text
transactions
unique constraints
FOR UPDATE locks
NUMERIC values
```

## 18. What Is Still Not Done?

Important: the financial service itself is not done yet.

So currently:

```text
The database access layer exists.
The domain models exist.
But the real wallet use cases are not implemented yet.
```

Next step is `LedgerService`.

## 19. Future Request Flow: PlaceHold

After the service is implemented, the flow should be:

```text
User places order or operation requiring locked funds
        |
wallet.Service.PlaceHold(...)
        |
Check idempotency key
        |
Begin PostgreSQL transaction
        |
Get or create user account for asset
        |
SELECT FOR UPDATE account row
        |
Calculate spendable balance:
posted ledger balance - active holds
        |
If enough balance: insert hold
        |
Commit transaction
```

In Go architecture:

```text
handler -> service -> store -> sqlc -> postgres
```

## 20. Future Request Flow: PostTransaction

For deposits or settlements:

```text
wallet.Service.PostTransaction(...)
        |
Validate idempotency key
        |
Build domain LedgerEntry objects
        |
domain.NewTransaction validates double-entry
        |
Begin PostgreSQL transaction
        |
Insert transaction row
        |
Insert ledger entries
        |
Complete transaction
        |
Commit
```

This is the core of the exchange.

## 21. Important Go Concepts Used Here

### `context.Context`

You see `ctx context.Context` everywhere.

It carries:

```text
request cancellation
timeouts
request-scoped values
```

Database calls receive `ctx` so they can stop if the request is cancelled.

### Interface

Example:

```go
type Repository interface {
    GetOrCreateAccount(...)
}
```

An interface says:

```text
Any type with these methods can be used here.
```

This helps testing and architecture.

### Struct

Example:

```go
type Account struct {
    ID kernel.ID
}
```

A struct is a data object.

### Method

Example:

```go
func (r *PostgresRepository) GetOrCreateAccount(...)
```

This is a function attached to `PostgresRepository`.

### Error Wrapping

Example:

```go
return nil, fmt.Errorf("wallet store: get hold: %w", err)
```

`%w` wraps the original error so callers can still inspect it.

## 22. Important PostgreSQL Concepts Used Here

### Table

A table stores rows.

Example:

```text
accounts
transactions
ledger_entries
holds
```

### Transaction

A PostgreSQL transaction groups multiple operations:

```sql
BEGIN;
INSERT ...
UPDATE ...
COMMIT;
```

If something fails:

```sql
ROLLBACK;
```

### Row Lock

`FOR UPDATE` locks a row until commit or rollback.

### NUMERIC

Money is stored as:

```sql
NUMERIC(36,18)
```

Not float.

This avoids rounding errors.

### Unique Constraint

`idempotency_key` is unique, so the same operation cannot be inserted twice.

## 23. Current Project State

Current state:

```text
Phase 0 foundation: mostly complete
Phase 0.5 domain modeling: mostly complete
Phase 1 ledger: partially started
```

More specifically:

```text
Done:
- Domain models
- Database tables
- sqlc queries
- Wallet repository port
- Wallet PostgreSQL repository
- Conversion tests
- Some store integration tests

Not done:
- Wallet service / LedgerService
- Wallet module wiring to Postgres pool
- HTTP endpoints for real wallet operations
- Service-level integration tests
- Trading settlement
- Matching engine
```

## 24. What You Should Learn From This Stage

At this stage, focus on understanding these concepts:

```text
1. Why balances should come from ledger entries
2. Why holds are separate from ledger entries
3. Why idempotency keys are required
4. Why PostgreSQL transactions are required
5. Why SELECT FOR UPDATE prevents overdraft
6. Why decimal.Decimal is used instead of float64
7. How service -> repository -> sqlc -> Postgres works
8. How domain validation protects financial invariants
```

If you understand those, you understand the foundation of a real exchange backend.

## 25. Next Step

The next implementation step should be:

```text
Implement wallet.Service as LedgerService.
```

That service will connect:

```text
wallet API
wallet domain rules
wallet repository
PostgreSQL transactions
```

After that, we need service-level tests proving:

```text
PlaceHold works
ReleaseHold works
Settle works
PostTransaction works
Idempotency works
Concurrent holds cannot overdraft
```

The most important next lesson:

```text
A financial service is not just inserting rows.
It is enforcing invariants across multiple rows inside a database transaction.
```

## Appendix: Code References

This appendix connects the architecture notes above to concrete code in the repository.

### Application Composition Root

File: `cmd/api/app/app.go`

This is where the application loads config, creates infrastructure clients, creates modules, and registers routes.

```go
// New builds the application graph: platform -> modules -> HTTP routes.
func New(ctx context.Context) (*App, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("app: load config: %w", err)
	}

	log := logger.NewApplicationLogger(logger.Options{
		Level:       cfg.Logging.Level,
		Format:      cfg.Logging.Format,
		ServiceName: cfg.Meta.ServiceName,
		Env:         string(cfg.Meta.Env),
		Version:     cfg.Meta.Version,
	})

	if err := migrate.Run(ctx, cfg.Postgres, migrate.DefaultDir); err != nil {
		return nil, fmt.Errorf("app: migrate: %w", err)
	}

	pg, err := postgres.NewPool(ctx, cfg.Postgres)
	if err != nil {
		return nil, fmt.Errorf("app: postgres: %w", err)
	}

	rd, err := redis.NewClient(ctx, cfg.Redis)
	if err != nil {
		pg.Close()
		return nil, fmt.Errorf("app: redis: %w", err)
	}

	iamMod := iam.New(iam.Dependencies{Logger: log})
	instrumentMod := instrument.New(instrument.Dependencies{Logger: log, Pool: pg.Pool})
	walletMod := wallet.New(wallet.Dependencies{Logger: log})
	tradingMod := trading.New(trading.Dependencies{Logger: log})

	modules := []platformmodule.Module{iamMod, instrumentMod, walletMod, tradingMod}
	// ...
}
```

Important point: `walletMod` is not wired to PostgreSQL yet. That should happen when `LedgerService` is implemented.

### Current Wallet API

File: `internal/module/wallet/api/api.go`

This is the interface exposed by the wallet module to the rest of the backend.

```go
type PlaceHoldCommand struct {
	UserID         kernel.ID
	Asset          kernel.AssetID
	Amount         string
	CorrelationID  string
	IdempotencyKey string
}

type HoldID kernel.ID

type ReleaseHoldCommand struct {
	HoldID HoldID
}

type SettleCommand struct {
	HoldID HoldID
}

type API interface {
	PlaceHold(ctx context.Context, cmd PlaceHoldCommand) (HoldID, error)
	ReleaseHold(ctx context.Context, cmd ReleaseHoldCommand) error
	Settle(ctx context.Context, cmd SettleCommand) error
}
```

Important point: `Amount` is currently a `string`. For the real ledger service it should become `decimal.Decimal`.

### Current Wallet Service Stub

File: `internal/module/wallet/service/service.go`

The service layer is not implemented yet. It currently returns `WALLET_NOT_IMPLEMENTED`.

```go
type Service struct{}

func New() *Service {
	return &Service{}
}

func (s *Service) PlaceHold(_ context.Context, _ walletapi.PlaceHoldCommand) (walletapi.HoldID, error) {
	var zero walletapi.HoldID
	return zero, kernel.NewApplicationError(kernel.ModuleWallet, "WALLET_NOT_IMPLEMENTED", "wallet module not implemented")
}

func (s *Service) ReleaseHold(_ context.Context, _ walletapi.ReleaseHoldCommand) error {
	return kernel.NewApplicationError(kernel.ModuleWallet, "WALLET_NOT_IMPLEMENTED", "wallet module not implemented")
}

func (s *Service) Settle(_ context.Context, _ walletapi.SettleCommand) error {
	return kernel.NewApplicationError(kernel.ModuleWallet, "WALLET_NOT_IMPLEMENTED", "wallet module not implemented")
}
```

Important point: the next major implementation step is to replace this stub with a real `LedgerService`.

### Wallet Repository Port

File: `internal/module/wallet/store/store.go`

The repository interface defines what database operations the service layer can use.

```go
type Repository interface {
	WithTx(tx pgx.Tx) Repository

	GetOrCreateAccount(ctx context.Context, userID kernel.ID, assetID kernel.AssetID, accountType string) (*Account, error)
	LockAccountForUpdate(ctx context.Context, accountID kernel.ID) (*Account, error)

	GetAvailableBalance(ctx context.Context, accountID kernel.ID, assetID kernel.AssetID) (decimal.Decimal, error)
	GetActiveHoldsSum(ctx context.Context, accountID kernel.ID, assetID kernel.AssetID) (decimal.Decimal, error)

	InsertHold(ctx context.Context, p InsertHoldParams) (*Hold, error)
	GetHold(ctx context.Context, holdID kernel.ID) (*Hold, error)
	GetHoldByIdempotencyKey(ctx context.Context, key string) (*Hold, error)
	ReleaseHold(ctx context.Context, holdID kernel.ID) (*Hold, error)
	SettleHold(ctx context.Context, holdID kernel.ID) (*Hold, error)

	InsertTransaction(ctx context.Context, p InsertTransactionParams) (*Transaction, error)
	CompleteTransaction(ctx context.Context, txID kernel.ID) (*Transaction, error)
	GetTransactionByIdempotencyKey(ctx context.Context, key string) (*Transaction, error)

	InsertLedgerEntry(ctx context.Context, p InsertLedgerEntryParams) error
}
```

Important point: this layer hides PostgreSQL and sqlc details from the service layer.

### PostgreSQL Repository Implementation

File: `internal/module/wallet/store/postgres.go`

This is the PostgreSQL implementation of the wallet repository.

```go
type PostgresRepository struct {
	q *walletdb.Queries
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{q: walletdb.New(pool)}
}

func (r *PostgresRepository) WithTx(tx pgx.Tx) Repository {
	return &PostgresRepository{q: r.q.WithTx(tx)}
}
```

Important point: `WithTx` lets the service run multiple repository operations inside one database transaction.

### Account Row Locking

File: `sql/queries/wallet/accounts.sql`

This query locks an account row while a transaction is running.

```sql
-- name: LockAccountForUpdate :one
SELECT id, user_id, asset_id, account_type, created_at
FROM accounts
WHERE id = $1
FOR UPDATE;
```

Important point: this is used to prevent concurrent overdraft bugs.

### Current Balance Queries

File: `sql/queries/wallet/accounts.sql`

Current posted balance query:

```sql
-- name: GetAvailableBalance :one
SELECT COALESCE(
    SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END),
    0
)::text AS balance
FROM ledger_entries
WHERE account_id = $1 AND asset_id = $2;
```

Current active holds query:

```sql
-- name: GetActiveHoldsSum :one
SELECT COALESCE(SUM(amount), 0)::text AS total
FROM holds
WHERE account_id = $1 AND asset_id = $2 AND status = 'active';
```

Important point: despite the method name, `GetAvailableBalance` currently returns posted ledger balance only. The service must subtract active holds:

```text
spendable balance = posted balance - active holds
```

### Future PlaceHold Flow

The future `wallet.Service.PlaceHold` should follow this shape:

```go
func (s *Service) PlaceHold(ctx context.Context, cmd walletapi.PlaceHoldCommand) (walletapi.HoldID, error) {
	// 1. Validate idempotency key and amount.
	// 2. Return existing active hold for duplicate idempotency key.
	// 3. Begin DB transaction.
	// 4. Use txRepo := s.repo.WithTx(tx).
	// 5. Get or create account.
	// 6. Lock account with SELECT FOR UPDATE.
	// 7. Calculate spendable = posted balance - active holds.
	// 8. Reject insufficient funds.
	// 9. Insert hold.
	// 10. Commit.
}
```

Important point: the lock, balance check, and hold insertion must happen inside the same PostgreSQL transaction.

### Future PostTransaction Flow

The future `wallet.Service.PostTransaction` should follow this shape:

```go
func (s *Service) PostTransaction(ctx context.Context, cmd walletapi.PostTransactionCommand) error {
	// 1. Validate idempotency key.
	// 2. Return nil if a completed transaction already exists for this key.
	// 3. Build domain ledger entries.
	// 4. Call domain.NewTransaction to enforce double-entry accounting.
	// 5. Begin DB transaction.
	// 6. Insert transaction row.
	// 7. Insert ledger entries.
	// 8. Mark transaction completed.
	// 9. Commit.
}
```

Important point: double-entry validation must happen before writing ledger entries to the database.

## Developer Code Walkthrough

This section is written for a developer who wants to read the project and understand how to modify it safely.

Each subsection explains:

```text
1. What the code is for
2. Where the code lives
3. What the important fields/methods mean
4. What to be careful about when modifying it
```

### Shared Money Type

File: `internal/kernel/money.go`

```go
package kernel

import "github.com/shopspring/decimal"

// Money represents a decimal monetary amount paired with an asset.
// Precision is determined by the Asset's declared decimal places.
type Money struct {
	Asset  AssetID
	Amount decimal.Decimal
}
```

What this means:

```text
Money always has two parts:
- Asset: BTC, USDT, IRT, GOLD, etc.
- Amount: exact decimal value
```

Why it matters:

```text
decimal.Decimal is used instead of float64 because float64 can introduce rounding errors.
Financial systems must not use float64 for balances, prices, quantities, or fees.
```

When modifying:

```text
Do not change Amount to float64.
Do not store money as int unless the whole project intentionally moves to minor units.
Do not parse user amounts without validation.
```

### Shared Error Model

File: `internal/kernel/errors.go`

```go
// Error is the root internal error contract.
type Error interface {
	error
	Code() Code
	Module() Module
	Message() string
	Retryable() bool
}

// DomainError represents a business rule violation.
type DomainError interface {
	Error
	IsDomainError()
}

// ApplicationError represents a use-case level failure.
type ApplicationError interface {
	Error
	IsApplicationError()
}

// InfrastructureError represents an adapter or dependency failure.
type InfrastructureError interface {
	Error
	IsInfrastructureError()
	Cause() error
}
```

What this means:

```text
DomainError:
  A business rule failed.
  Example: insufficient balance, unbalanced transaction, invalid order quantity.

ApplicationError:
  A use case failed at orchestration level.
  Example: service not implemented, invalid command, operation rejected.

InfrastructureError:
  A dependency failed.
  Example: PostgreSQL error, Redis timeout, network issue.
```

How to create errors:

```go
func NewDomainError(module Module, code Code, message string) DomainError {
	return &DomainErrorImpl{baseError: baseError{code: code, module: module, message: message}}
}

func NewApplicationError(module Module, code Code, message string) ApplicationError {
	return &ApplicationErrorImpl{baseError: baseError{code: code, module: module, message: message}}
}

func NewInfrastructureError(module Module, code Code, message string, cause error, retryable bool) InfrastructureError {
	return &InfrastructureErrorImpl{
		baseError: baseError{code: code, module: module, message: message, retryable: retryable},
		cause:     cause,
	}
}
```

When modifying:

```text
Use domain errors for business rules.
Use infrastructure errors for PostgreSQL/Redis/external-service failures.
Do not return raw database errors from service layer.
Keep error codes stable because APIs and clients may depend on them.
```

### Ledger Entry Domain Model

File: `internal/module/wallet/domain/ledger.go`

```go
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
```

What this means:

```text
LedgerEntry is one accounting line.
It never stores negative amounts.
The Direction field decides whether the account is debited or credited.
```

Constructor:

```go
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
```

When modifying:

```text
Do not allow zero or negative ledger amounts.
Consider adding explicit validation that Direction is either "debit" or "credit".
Do not add a mutable balance field here.
Do not make ledger entries editable after insertion.
```

### Transaction Domain Model

File: `internal/module/wallet/domain/ledger.go`

```go
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
```

What this means:

```text
A Transaction groups multiple ledger entries.
For every asset inside the transaction, credits must equal debits.
```

Creation:

```go
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
```

Double-entry validation:

```go
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
```

When modifying:

```text
Never bypass NewTransaction when posting financial movements.
Always validate double-entry before writing to PostgreSQL.
Every transaction should have an idempotency key.
Do not mark a transaction completed until all ledger entries are written.
```

### Hold Domain Model

File: `internal/module/wallet/domain/hold.go`

```go
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
```

What this means:

```text
A Hold reserves funds without moving them in the ledger yet.
It affects available balance, but it is not itself a ledger entry.
```

Creating a hold:

```go
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
```

Releasing and settling:

```go
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
```

When modifying:

```text
Only active holds can be released or settled.
Release means the reservation is cancelled.
Settle means the reservation was consumed by a real ledger transaction.
Do not create ledger entries on release.
Do create ledger entries when settling value transfer.
```

### Trading Order Domain Model

File: `internal/module/trading/domain/order.go`

```go
// Order is the trading aggregate root representing a user's instruction to buy
// or sell on a trading pair. It does not move money — it coordinates Holds.
type Order struct {
	ID             kernel.ID
	UserID         kernel.ID
	Pair           kernel.PairID
	Side           Side
	Type           OrderType
	Status         OrderStatus
	Price          *decimal.Decimal // nil for market orders
	Quantity       decimal.Decimal
	FilledQty      decimal.Decimal
	RemainingQty   decimal.Decimal
	IdempotencyKey string
	CreatedAt      time.Time
	UpdatedAt      time.Time

	events []DomainEvent
}
```

What this means:

```text
Order does not directly move money.
Order coordinates with Wallet to place holds.
When trades happen, settlement must go through the ledger.
```

Creating a limit order:

```go
func NewLimitOrder(
	id kernel.ID,
	userID kernel.ID,
	pair kernel.PairID,
	side Side,
	price decimal.Decimal,
	qty decimal.Decimal,
	idempotencyKey string,
	now time.Time,
) (*Order, error) {
	if !price.IsPositive() {
		return nil, ErrInvalidOrderPrice(fmt.Sprintf("limit price must be > 0, got %s", price))
	}
	if err := validateQtyAndKey(qty, idempotencyKey); err != nil {
		return nil, err
	}
	p := price
	o := &Order{
		ID:             id,
		UserID:         userID,
		Pair:           pair,
		Side:           side,
		Type:           OrderTypeLimit,
		Status:         OrderStatusPending,
		Price:          &p,
		Quantity:       qty,
		FilledQty:      decimal.Zero,
		RemainingQty:   qty,
		IdempotencyKey: idempotencyKey,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	o.record(OrderPlacedEvent{baseEvent{aggregateID: id, occurredAt: now}})
	return o, nil
}
```

Filling an order:

```go
func (o *Order) Fill(qty decimal.Decimal, now time.Time) error {
	if o.Status != OrderStatusOpen && o.Status != OrderStatusPartiallyFilled {
		return ErrOrderNotOpen()
	}
	if !qty.IsPositive() {
		return ErrInvalidOrderQty(fmt.Sprintf("fill qty must be > 0, got %s", qty))
	}
	if qty.GreaterThan(o.RemainingQty) {
		return ErrInvalidOrderQty(
			fmt.Sprintf("fill qty %s exceeds remaining qty %s", qty, o.RemainingQty),
		)
	}

	o.FilledQty = o.FilledQty.Add(qty)
	o.RemainingQty = o.RemainingQty.Sub(qty)
	o.UpdatedAt = now

	if o.RemainingQty.IsZero() {
		o.Status = OrderStatusFilled
		o.record(OrderFilledEvent{baseEvent{aggregateID: o.ID, occurredAt: now}})
	} else {
		o.Status = OrderStatusPartiallyFilled
		o.record(OrderPartiallyFilledEvent{
			baseEvent: baseEvent{aggregateID: o.ID, occurredAt: now},
			FilledQty: qty.String(),
		})
	}
	return nil
}
```

When modifying:

```text
Do not move money directly from the trading domain.
Trading should ask wallet to hold funds and settle trades.
Order status transitions must stay strict.
Partial fills must never exceed RemainingQty.
```

## Future Implementation Guide: LedgerService

The next major implementation is the wallet service. This is the most important service in the project because it enforces financial correctness.

Target file:

```text
internal/module/wallet/service/service.go
```

Target shape:

```go
type Service struct {
	repo store.Repository
	pool *pgxpool.Pool
}

func New(repo store.Repository, pool *pgxpool.Pool) *Service {
	return &Service{repo: repo, pool: pool}
}
```

### Future API Shape

Target file:

```text
internal/module/wallet/api/api.go
```

Recommended future API:

```go
type HoldID kernel.ID

type PlaceHoldCommand struct {
	UserID         kernel.ID
	Asset          kernel.AssetID
	Amount         decimal.Decimal
	CorrelationID  string
	IdempotencyKey string
}

type ReleaseHoldCommand struct {
	HoldID HoldID
}

type SettleCommand struct {
	HoldID       HoldID
	CreditUserID kernel.ID
}

type EntrySpec struct {
	UserID    kernel.ID
	Asset     kernel.AssetID
	Direction string
	Amount    decimal.Decimal
}

type PostTransactionCommand struct {
	IdempotencyKey string
	Type           string
	Entries        []EntrySpec
}

type API interface {
	PlaceHold(ctx context.Context, cmd PlaceHoldCommand) (HoldID, error)
	ReleaseHold(ctx context.Context, cmd ReleaseHoldCommand) error
	Settle(ctx context.Context, cmd SettleCommand) error
	PostTransaction(ctx context.Context, cmd PostTransactionCommand) error
	GetAvailableBalance(ctx context.Context, userID kernel.ID, assetID kernel.AssetID) (decimal.Decimal, error)
}
```

### Future Helper: Infrastructure Error Wrapping

Use this pattern in service layer:

```go
func wrapInfra(message string, err error) error {
	if err == nil {
		return nil
	}
	return kernel.NewInfrastructureError(
		kernel.ModuleWallet,
		kernel.CodeServiceUnavailable,
		message,
		err,
		true,
	)
}
```

Why:

```text
The service layer should not expose raw pgx/sqlc errors.
Callers should receive stable application/domain error codes.
```

### Future Helper: Idempotency Key Validation

```go
func validateIdempotencyKey(key string) error {
	if strings.TrimSpace(key) == "" {
		return kernel.NewDomainError(
			kernel.ModuleWallet,
			kernel.CodeValidationInvalidInput,
			"idempotency key is required",
		)
	}
	return nil
}
```

Why:

```text
Financial operations must be safely retryable.
The idempotency key lets the same request be retried without duplicating money movement.
```

### Future Helper: Direction Validation

```go
func validateDirection(direction string) error {
	switch domain.Direction(direction) {
	case domain.DirectionDebit, domain.DirectionCredit:
		return nil
	default:
		return kernel.NewDomainError(
			kernel.ModuleWallet,
			kernel.CodeValidationInvalidInput,
			fmt.Sprintf("invalid ledger direction %q", direction),
		)
	}
}
```

Why:

```text
Only debit and credit are valid ledger directions.
Any other string should be rejected before writing to the database.
```

### Future Method: PlaceHold

`PlaceHold` reserves user balance.

Full intended flow:

```text
1. Validate idempotency key.
2. Check if a hold already exists for this idempotency key.
3. If active hold exists, return its ID.
4. Validate amount > 0.
5. Begin PostgreSQL transaction.
6. Use repository scoped to transaction.
7. Get or create user account.
8. Lock account row using SELECT FOR UPDATE.
9. Read posted ledger balance.
10. Read active holds sum.
11. Calculate spendable = posted balance - active holds.
12. Reject if spendable < requested hold.
13. Insert hold.
14. Commit transaction.
```

Future skeleton:

```go
func (s *Service) PlaceHold(ctx context.Context, cmd walletapi.PlaceHoldCommand) (walletapi.HoldID, error) {
	if err := validateIdempotencyKey(cmd.IdempotencyKey); err != nil {
		return walletapi.HoldID{}, err
	}
	if !cmd.Amount.IsPositive() {
		return walletapi.HoldID{}, domain.ErrInsufficientBalance()
	}

	existing, err := s.repo.GetHoldByIdempotencyKey(ctx, cmd.IdempotencyKey)
	if err != nil {
		return walletapi.HoldID{}, wrapInfra("wallet: get hold by idempotency key", err)
	}
	if existing != nil && existing.Status == string(domain.HoldStatusActive) {
		return walletapi.HoldID(existing.ID), nil
	}

	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return walletapi.HoldID{}, wrapInfra("wallet: begin place hold transaction", err)
	}
	defer tx.Rollback(ctx)

	txRepo := s.repo.WithTx(tx)

	account, err := txRepo.GetOrCreateAccount(ctx, cmd.UserID, cmd.Asset, string(domain.AccountTypeUser))
	if err != nil {
		return walletapi.HoldID{}, wrapInfra("wallet: get or create account", err)
	}

	if _, err := txRepo.LockAccountForUpdate(ctx, account.ID); err != nil {
		return walletapi.HoldID{}, wrapInfra("wallet: lock account", err)
	}

	postedBalance, err := txRepo.GetAvailableBalance(ctx, account.ID, cmd.Asset)
	if err != nil {
		return walletapi.HoldID{}, wrapInfra("wallet: get posted balance", err)
	}

	activeHolds, err := txRepo.GetActiveHoldsSum(ctx, account.ID, cmd.Asset)
	if err != nil {
		return walletapi.HoldID{}, wrapInfra("wallet: get active holds", err)
	}

	spendable := postedBalance.Sub(activeHolds)
	if spendable.LessThan(cmd.Amount) {
		return walletapi.HoldID{}, domain.ErrInsufficientBalance()
	}

	holdID := kernel.NewID()
	hold, err := txRepo.InsertHold(ctx, store.InsertHoldParams{
		ID:             holdID,
		AccountID:      account.ID,
		Amount:         cmd.Amount,
		AssetID:        cmd.Asset,
		IdempotencyKey: cmd.IdempotencyKey,
	})
	if err != nil {
		return walletapi.HoldID{}, wrapInfra("wallet: insert hold", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return walletapi.HoldID{}, wrapInfra("wallet: commit place hold", err)
	}

	return walletapi.HoldID(hold.ID), nil
}
```

Important notes:

```text
The account lock must happen before reading balance.
The balance check and hold insert must be in the same transaction.
The function is idempotent for duplicate client retries.
```

### Future Method: ReleaseHold

`ReleaseHold` cancels a reservation.

Future skeleton:

```go
func (s *Service) ReleaseHold(ctx context.Context, cmd walletapi.ReleaseHoldCommand) error {
	hold, err := s.repo.GetHold(ctx, kernel.ID(cmd.HoldID))
	if err != nil {
		return wrapInfra("wallet: get hold", err)
	}
	if hold == nil {
		return domain.ErrHoldNotFound()
	}
	if hold.Status != string(domain.HoldStatusActive) {
		return domain.ErrHoldAlreadySettled()
	}

	updated, err := s.repo.ReleaseHold(ctx, kernel.ID(cmd.HoldID))
	if err != nil {
		return wrapInfra("wallet: release hold", err)
	}
	if updated == nil {
		return domain.ErrHoldAlreadySettled()
	}
	return nil
}
```

Important notes:

```text
Release does not create ledger entries.
Release only changes hold status from active to released.
```

### Future Method: Settle

`Settle` consumes a hold and creates ledger movement.

Future skeleton:

```go
func (s *Service) Settle(ctx context.Context, cmd walletapi.SettleCommand) error {
	hold, err := s.repo.GetHold(ctx, kernel.ID(cmd.HoldID))
	if err != nil {
		return wrapInfra("wallet: get hold", err)
	}
	if hold == nil {
		return domain.ErrHoldNotFound()
	}
	if hold.Status != string(domain.HoldStatusActive) {
		return domain.ErrHoldAlreadySettled()
	}

	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return wrapInfra("wallet: begin settle transaction", err)
	}
	defer tx.Rollback(ctx)

	txRepo := s.repo.WithTx(tx)

	settled, err := txRepo.SettleHold(ctx, kernel.ID(cmd.HoldID))
	if err != nil {
		return wrapInfra("wallet: settle hold", err)
	}
	if settled == nil {
		return domain.ErrHoldAlreadySettled()
	}

	creditAccount, err := txRepo.GetOrCreateAccount(ctx, cmd.CreditUserID, hold.AssetID, string(domain.AccountTypeUser))
	if err != nil {
		return wrapInfra("wallet: get credit account", err)
	}

	txID := kernel.NewID()
	idempotencyKey := "settle-" + kernel.ID(cmd.HoldID).String()

	if _, err := txRepo.InsertTransaction(ctx, store.InsertTransactionParams{
		ID:             txID,
		IdempotencyKey: idempotencyKey,
		Type:           string(domain.TxTypeTradeSettlement),
	}); err != nil {
		return wrapInfra("wallet: insert settlement transaction", err)
	}

	if err := txRepo.InsertLedgerEntry(ctx, store.InsertLedgerEntryParams{
		ID:            kernel.NewID(),
		TransactionID: txID,
		AccountID:     hold.AccountID,
		Direction:     string(domain.DirectionDebit),
		Amount:        hold.Amount,
		AssetID:       hold.AssetID,
	}); err != nil {
		return wrapInfra("wallet: insert settlement debit", err)
	}

	if err := txRepo.InsertLedgerEntry(ctx, store.InsertLedgerEntryParams{
		ID:            kernel.NewID(),
		TransactionID: txID,
		AccountID:     creditAccount.ID,
		Direction:     string(domain.DirectionCredit),
		Amount:        hold.Amount,
		AssetID:       hold.AssetID,
	}); err != nil {
		return wrapInfra("wallet: insert settlement credit", err)
	}

	if _, err := txRepo.CompleteTransaction(ctx, txID); err != nil {
		return wrapInfra("wallet: complete settlement transaction", err)
	}

	return tx.Commit(ctx)
}
```

Important notes:

```text
Settle changes hold status and writes ledger entries.
Both must happen in the same database transaction.
If any insert fails, the whole transaction rolls back.
```

### Future Method: PostTransaction

`PostTransaction` posts a manually specified balanced transaction, such as deposits or system adjustments.

Future skeleton:

```go
func (s *Service) PostTransaction(ctx context.Context, cmd walletapi.PostTransactionCommand) error {
	if err := validateIdempotencyKey(cmd.IdempotencyKey); err != nil {
		return err
	}
	if len(cmd.Entries) < 2 {
		return kernel.NewDomainError(
			kernel.ModuleWallet,
			kernel.CodeValidationInvalidInput,
			"transaction must have at least two entries",
		)
	}

	existing, err := s.repo.GetTransactionByIdempotencyKey(ctx, cmd.IdempotencyKey)
	if err != nil {
		return wrapInfra("wallet: get transaction by idempotency key", err)
	}
	if existing != nil && existing.Status == string(domain.TxStatusCompleted) {
		return nil
	}

	txID := kernel.NewID()
	now := time.Now()
	domainEntries := make([]domain.LedgerEntry, 0, len(cmd.Entries))

	for _, entry := range cmd.Entries {
		if err := validateDirection(entry.Direction); err != nil {
			return err
		}
		if !entry.Amount.IsPositive() {
			return kernel.NewDomainError(
				kernel.ModuleWallet,
				kernel.CodeValidationInvalidInput,
				"ledger entry amount must be positive",
			)
		}

		ledgerEntry, err := domain.NewLedgerEntry(
			kernel.NewID(),
			txID,
			kernel.NewID(), // temporary account ID for domain validation only
			domain.Direction(entry.Direction),
			entry.Amount,
			entry.Asset,
			now,
		)
		if err != nil {
			return err
		}
		domainEntries = append(domainEntries, *ledgerEntry)
	}

	if _, err := domain.NewTransaction(
		txID,
		cmd.IdempotencyKey,
		domain.TransactionType(cmd.Type),
		domainEntries,
		now,
	); err != nil {
		return err
	}

	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return wrapInfra("wallet: begin post transaction", err)
	}
	defer tx.Rollback(ctx)

	txRepo := s.repo.WithTx(tx)

	if _, err := txRepo.InsertTransaction(ctx, store.InsertTransactionParams{
		ID:             txID,
		IdempotencyKey: cmd.IdempotencyKey,
		Type:           cmd.Type,
	}); err != nil {
		return wrapInfra("wallet: insert transaction", err)
	}

	for _, entry := range cmd.Entries {
		account, err := txRepo.GetOrCreateAccount(ctx, entry.UserID, entry.Asset, string(domain.AccountTypeUser))
		if err != nil {
			return wrapInfra("wallet: get transaction account", err)
		}

		if err := txRepo.InsertLedgerEntry(ctx, store.InsertLedgerEntryParams{
			ID:            kernel.NewID(),
			TransactionID: txID,
			AccountID:     account.ID,
			Direction:     entry.Direction,
			Amount:        entry.Amount,
			AssetID:       entry.Asset,
		}); err != nil {
			return wrapInfra("wallet: insert ledger entry", err)
		}
	}

	if _, err := txRepo.CompleteTransaction(ctx, txID); err != nil {
		return wrapInfra("wallet: complete transaction", err)
	}

	return tx.Commit(ctx)
}
```

Important notes:

```text
The temporary account ID in domain.NewLedgerEntry is only for invariant validation.
The real account IDs are resolved inside the database transaction.
Never write unbalanced transactions to the database.
```

### Future Method: GetAvailableBalance

Recommended final semantics:

```text
GetAvailableBalance should return spendable balance.
spendable = posted ledger balance - active holds
```

Future skeleton:

```go
func (s *Service) GetAvailableBalance(ctx context.Context, userID kernel.ID, assetID kernel.AssetID) (decimal.Decimal, error) {
	account, err := s.repo.GetOrCreateAccount(ctx, userID, assetID, string(domain.AccountTypeUser))
	if err != nil {
		return decimal.Zero, wrapInfra("wallet: get or create account", err)
	}

	postedBalance, err := s.repo.GetAvailableBalance(ctx, account.ID, assetID)
	if err != nil {
		return decimal.Zero, wrapInfra("wallet: get posted balance", err)
	}

	activeHolds, err := s.repo.GetActiveHoldsSum(ctx, account.ID, assetID)
	if err != nil {
		return decimal.Zero, wrapInfra("wallet: get active holds", err)
	}

	return postedBalance.Sub(activeHolds), nil
}
```

## Future Implementation Guide: Module Wiring

After `LedgerService` exists, the wallet module must be wired to PostgreSQL.

Target file:

```text
internal/module/wallet/module.go
```

Future shape:

```go
type Dependencies struct {
	Logger logger.ApplicationLogger
	Pool   *pgxpool.Pool
}

func New(deps Dependencies) *Module {
	repo := walletstore.NewPostgresRepository(deps.Pool)
	svc := service.New(repo, deps.Pool)

	return &Module{
		api:     svc,
		handler: handler.New(svc),
	}
}
```

Then update:

```text
cmd/api/app/app.go
```

From:

```go
walletMod := wallet.New(wallet.Dependencies{Logger: log})
```

To:

```go
walletMod := wallet.New(wallet.Dependencies{Logger: log, Pool: pg.Pool})
```

Important point:

```text
Until this wiring is done, the real wallet service cannot use PostgreSQL.
```

## Future Test Guide

After implementing `LedgerService`, tests should prove financial correctness.

### Unit Tests

Run existing domain and store tests:

```bash
go test ./internal/module/wallet/domain/...
go test ./internal/module/wallet/store/...
```

### Integration Tests

Add service integration tests for:

```text
PostTransaction deposit
PlaceHold reduces available balance
PlaceHold rejects insufficient balance
ReleaseHold restores available balance
Settle transfers held funds
PlaceHold idempotency
PostTransaction idempotency
Concurrent holds cannot overdraft
```

Example concurrency test idea:

```go
func TestPlaceHold_ConcurrentRequestsCannotOverdraft(t *testing.T) {
	// 1. Deposit 100 USDT to user.
	// 2. Start 10 goroutines.
	// 3. Each goroutine tries to hold 20 USDT.
	// 4. Exactly 5 should succeed.
	// 5. The rest should fail with WALLET_INSUFFICIENT_BALANCE.
	// 6. Final available balance should be 0.
}
```

Why this matters:

```text
This proves SELECT FOR UPDATE and transaction boundaries are working.
Without this test, the system may pass normal tests but fail under real concurrent user traffic.
```

## Modification Checklist

Before modifying wallet/ledger code, check this list:

```text
1. Am I using decimal.Decimal for all money?
2. Am I avoiding float64 completely?
3. Am I avoiding direct balance updates?
4. Is the operation idempotent?
5. Does the operation run inside a DB transaction?
6. Do I need SELECT FOR UPDATE?
7. Are active holds subtracted from spendable balance?
8. Is the ledger transaction balanced?
9. Are raw database errors wrapped before leaving service layer?
10. Is there a concurrency test for money-moving logic?
```

If any answer is no, the change is probably not safe for a real exchange.
