# Bounded Contexts

## Overview

The exchange is divided into four bounded contexts. Each context owns its data and exposes a typed Go interface (`api/api.go`) as its only public boundary. Cross-context calls are made through these interfaces — never by importing another context's `domain` or `store` packages.

```
┌─────────────────────────────────────────────────────────────────┐
│                          IAM Context                            │
│                                                                 │
│  User (AR)   Email (VO)   Session (AR, future)                  │
│                                                                 │
│  Publishes: user.registered, user.suspended, user.activated     │
└────────────────────────────┬────────────────────────────────────┘
                             │ UserID (kernel.ID) — identity ref
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Wallet / Ledger Context                    │
│                                                                 │
│  Account (AR)   Transaction (AR)   LedgerEntry (VO)   Hold      │
│                                                                 │
│  Publishes: wallet.balance_held, wallet.hold_released,          │
│             wallet.hold_settled, wallet.transaction_completed   │
│                                                                 │
│  Consumes:  AssetID from Instrument (for account.asset_id)      │
│             UserID  from IAM       (for account.user_id)        │
└──────────────┬──────────────────────────────┬───────────────────┘
               │ AssetID (kernel.AssetID)      │ HoldID / AccountID
               ▼                              ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│    Instrument Context    │   │         Trading Context          │
│                          │   │                                  │
│  Asset (Entity)          │   │  Order (AR)   Trade (VO)         │
│  TradingPair (Entity)    │   │                                  │
│                          │   │  Publishes: trading.order_placed,│
│  Publishes: (none yet)   │   │   trading.order_opened,          │
│                          │   │   trading.order_filled,          │
│  Consumed by: Wallet     │◄──│   trading.trade_executed, ...    │
│               Trading    │   │                                  │
│                          │   │  Consumes: PairID from Instrument│
│                          │   │            HoldID from Wallet    │
└──────────────────────────┘   └──────────────────────────────────┘
```

---

## IAM Context

**Module:** `internal/module/iam`
**Package interface:** `internal/module/iam/api`

**Owns:** User identity, credentials, and account status.

**Responsibilities:**
- User registration, login credential validation, status management (active / suspended / pending verification)
- Future: session lifecycle, JWT issuance, MFA

**Exposes:**
- `GetUser(ctx, id) (*User, error)`
- `Authenticate(ctx, email, password) (*User, error)` _(Phase 1)_

**Knows about other contexts:** Nothing. IAM has no outbound dependencies on other bounded contexts.

---

## Instrument Context

**Module:** `internal/module/instrument`
**Package interface:** `internal/module/instrument/api`

**Owns:** The authoritative catalog of Assets and TradingPairs.

**Responsibilities:**
- Serving asset metadata (symbol, decimals, enabled status)
- Serving trading pair constraints (min/max order size, precision rules)
- Enabling/disabling assets and pairs (admin operations)

**Exposes:**
- `GetAsset(ctx, id) (*Asset, error)`
- `GetTradingPair(ctx, id) (*TradingPair, error)` _(Phase 3)_

**Knows about other contexts:** Nothing. Instrument has no outbound dependencies.

---

## Wallet / Ledger Context

**Module:** `internal/module/wallet`
**Package interface:** `internal/module/wallet/api`

**Owns:** All financial state — accounts, posted balances, holds, and ledger transactions. This is the **sole financial write authority** in the system.

**Responsibilities:**
- Account creation and lookup (one account per user × asset × type)
- Balance derivation via `SELECT SUM` over LedgerEntries (never stored)
- Hold creation, release, and settlement
- Double-entry transaction recording
- Available balance enforcement: `sum(active_holds) ≤ posted_balance`

**Exposes:**
- `GetOrCreateAccount(ctx, userID, assetID, type) (*Account, error)` _(Phase 1)_
- `PlaceHold(ctx, cmd) (HoldID, error)` _(Phase 1)_
- `SettleHold(ctx, holdID, txCmd) error` _(Phase 3)_

**Knows about other contexts:**
- Receives `AssetID` from Instrument (used as a string key, no direct import of instrument domain)
- Receives `UserID` from IAM (used as a UUID key, no direct import of IAM domain)

---

## Trading Context

**Module:** `internal/module/trading`
**Package interface:** `internal/module/trading/api`

**Owns:** Order lifecycle and trade records.

**Responsibilities:**
- Accepting and validating order placement commands
- Coordinating with Wallet to place/release holds before order acceptance
- Delegating to the matching engine (Phase 3)
- Recording Trade value objects on match

**Exposes:**
- `PlaceOrder(ctx, cmd) (OrderID, error)`
- `CancelOrder(ctx, orderID, userID) error`

**Knows about other contexts:**
- **Instrument:** validates PairID and order size constraints via `instrumentapi.API`
- **Wallet:** places and settles Holds via `walletapi.API`
- **IAM:** receives UserID (passed by the HTTP handler from the auth token — no direct API call needed)
