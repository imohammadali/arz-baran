# Professional Roadmap for Building a Crypto and Online Gold Exchange

This document is a practical roadmap for building a serious crypto and online gold exchange. It is written for a developer who has already built exchange frontends and now wants to understand and implement the real backend, financial, security, and operational systems behind an exchange.

## Core Mindset

A real exchange is not just a trading UI. It is a digital bank, accounting system, trading venue, wallet system, risk platform, security platform, and real-time infrastructure.

The frontend is only a small part of the product. The real responsibility of the backend is to make sure user funds are never lost, duplicated, incorrectly locked, incorrectly settled, or exposed to avoidable security risk.

The most important rule:

```text
Start with accounting, not trading.
```

## High-Level Architecture

```text
Frontend / Mobile / Admin Panel
        |
API Gateway / Backend API
        |
Core Backend Modules
        |
Auth | User | Wallet | Ledger | Trading | Matching | Market Data
KYC | AML | Risk | Notification | Admin | Treasury | Reconciliation
        |
PostgreSQL | Redis | Kafka | ClickHouse | Object Storage
        |
Blockchain Nodes | Payment Gateways | Gold Provider | Monitoring
```

For the first MVP, not every component must be fully implemented. However, the architecture should leave room for these systems to be added later without rewriting the core.

## Ledger: The Most Important System

The ledger is the source of truth for all financial state.

Do not model balances as a mutable number:

```sql
UPDATE wallets SET balance = balance - 100 WHERE user_id = ...;
```

Instead, use an immutable double-entry ledger. Every financial movement must create ledger entries. Nothing financial should be overwritten or silently deleted.

Example: a user sells 1 BTC for 50,000 USDT.

```text
User BTC Account        debit   1 BTC
Exchange BTC Account    credit  1 BTC

Exchange USDT Account   debit   50000 USDT
User USDT Account       credit  50000 USDT
```

The invariant is:

```text
sum(debits) == sum(credits)
```

The basic ledger tables are:

```text
accounts
transactions
ledger_entries
holds
settlements
idempotency_keys
```

Available balance should be derived:

```text
available balance = ledger balance - active holds
```

## Wallet vs Ledger

Wallet is the product-facing view of user funds. Ledger is the accounting truth.

Wallet displays:

```text
BTC balance
USDT balance
IRT balance
Gold balance
```

Ledger records why those balances exist.

For each asset, track:

```text
Total Balance
Available Balance
Locked Balance
Pending Deposit
Pending Withdrawal
```

When a user places an order, funds should usually be held first:

```text
User has 1000 USDT
User places buy order requiring 300 USDT

Available = 700
Locked = 300
Total = 1000
```

If the order is cancelled, the hold is released. If the order is matched, the hold is settled into ledger entries.

## Matching Engine

The matching engine manages:

```text
Order book
Price-time priority
Limit orders
Market orders
Partial fills
Cancels
Trade generation
```

Example order book:

```text
Bids:
50000 -> 2 BTC
49900 -> 1 BTC

Asks:
50100 -> 0.5 BTC
50200 -> 3 BTC
```

The trading flow should be:

```text
Validate order
Validate balance
Place hold
Insert order
Match order
Generate trade
Settle in ledger
Publish market data
```

An order should not be accepted into the market unless the required funds or assets have already been reserved.

## Crypto Deposit Flow

```text
User sends crypto to deposit address
Blockchain node detects transaction
System waits for required confirmations
Risk/AML checks run
Internal ledger transaction is posted
User account is credited
User is notified
```

Important concerns:

```text
Confirmation count
Chain reorgs
Duplicate transaction detection
Wrong network deposits
Address reuse
Deposits below minimum
Suspicious source addresses
```

## Crypto Withdrawal Flow

```text
User requests withdrawal
System checks available balance
System places hold
Risk checks run
AML checks run
Admin/manual approval if needed
Signer signs transaction
Transaction is broadcast
Withdrawal becomes pending
On confirmation, ledger is settled
```

Withdrawals are one of the most dangerous parts of an exchange. They need strict controls, audit logs, risk scoring, approval workflows, and secure signing.

## Hot, Warm, Cold Wallets and Treasury

Typical wallet structure:

```text
Hot Wallet: online, used for daily withdrawals, high risk
Warm Wallet: limited operational use
Cold Wallet: offline or highly protected, main reserve
```

A conservative model:

```text
90-95% of funds in cold storage
5-10% operational liquidity in hot wallet
```

Treasury is responsible for:

```text
Hot wallet refill
Moving excess funds to cold storage
Gas/fee management
Blockchain balance monitoring
Internal vs external reconciliation
Emergency freeze procedures
```

## Reconciliation

Reconciliation continuously compares internal accounting with external reality.

For crypto:

```text
Internal ledger balance == actual blockchain balance
```

For gold:

```text
Internal gold balance == actual custodian or vault balance
```

Any mismatch can indicate:

```text
Accounting bug
Missed blockchain transaction
Duplicate deposit
Incorrect withdrawal
Manual operation not recorded
Security incident
```

## Security

Minimum serious security requirements:

```text
MFA
Rate limiting
Device fingerprinting
Withdrawal whitelist
Audit logs
Admin activity logs
IP/session monitoring
Encryption at rest
Secret manager
HSM or serious key management
Role-based access control
Maker/checker approval for sensitive operations
Anomaly detection
DDoS protection
```

Every sensitive operation should answer:

```text
Who did it?
What did they do?
When did they do it?
From where?
Why was it allowed?
What changed before and after?
```

## KYC, AML, and Risk

KYC usually includes:

```text
Phone verification
National ID
OCR
Selfie
Liveness detection
Bank account ownership verification
```

AML and risk usually include:

```text
Suspicious address screening
Velocity limits
Withdrawal limits by verification level
Sanctions screening
Transaction monitoring
Delayed withdrawals for new users
Manual review queues
```

## Online Gold Market

Gold has different risks than crypto.

There are two major models.

### Real Backed Gold

Each gram bought by a user is backed by real gold.

This requires:

```text
Gold supplier
Vault or custodian
Inventory audit
Insurance
Physical or cash settlement rules
Custody reconciliation
Spread and storage fee policy
```

### Synthetic / CFD Gold

The user does not own physical gold. They only get price exposure.

This can be technically simpler, but it has serious legal and risk implications. The product must clearly define whether the user owns real gold or only a synthetic position.

## Database and Infrastructure Choices

Typical storage choices:

```text
PostgreSQL: ledger, users, orders, withdrawals
Redis: cache, coordination, pub/sub for small workloads
Kafka or NATS: event streaming
ClickHouse: market data, candles, analytics
Elasticsearch/OpenSearch: log search
Prometheus/Grafana: monitoring
```

For the ledger, use an ACID database such as PostgreSQL. Avoid using MongoDB as the primary ledger database.

## Build Phases

### Phase 0: Foundation

```text
Modular monolith
Configuration
Structured logging
Health checks
PostgreSQL
Redis
Migrations
sqlc
Docker
```

### Phase 0.5: Domain Modeling

```text
User
Asset
Account
Transaction
LedgerEntry
Hold
Order
Trade
Domain events
ADR documents
```

### Phase 1: Ledger

```text
Double-entry ledger
PostTransaction
PlaceHold
ReleaseHold
Settle
Idempotency
Database transactions
Concurrency tests
Invariant tests
```

Do not move to serious trading until the ledger is correct.

### Phase 2: Identity and Wallet API

```text
Register
Login
JWT
Refresh tokens
User wallets
Balance endpoint
Simulated deposits
Simulated withdrawals
MFA later
```

### Phase 3: Trading

```text
Order placement
Hold funds
Simple matching engine
Trade generation
Ledger settlement
Order cancellation
Partial fills
```

### Phase 4: Market Data

```text
Order book snapshots
Trade stream
Ticker
Candles
WebSocket
Redis Pub/Sub or Kafka
```

### Phase 5: Admin API

```text
User management
Account freezing
Withdrawal approval
Ledger audit
Manual adjustments with strict audit
Risk dashboard
```

### Phase 6: Security Hardening

```text
MFA
Admin RBAC
Audit log persistence
Rate limiting
Withdrawal whitelist
Secret management
Security monitoring
```

### Phase 7: Real Blockchain Infrastructure

```text
Real nodes
Deposit address generation
Blockchain scanner
Confirmation handling
Withdrawal signer
Hot/cold wallet operations
```

### Phase 8: Gold Infrastructure

```text
Gold provider integration
Gold ledger support
Gold price feed
Spread engine
Settlement
Custody reconciliation
```

### Phase 9: DevOps and High Availability

```text
CI/CD
Kubernetes
Monitoring
Alerting
Backups
Disaster recovery
Incident runbooks
```

## Suggested MVP

Start with:

```text
Spot only
BTC/USDT only
No leverage
No futures
No real blockchain at first
Internal deposit/withdraw simulation
Double-entry ledger
Simple matching engine
Admin audit tools
```

This is small enough to build, but serious enough to become the foundation of a real exchange.

## Required Knowledge

Priority learning path:

```text
Go backend engineering
PostgreSQL transactions
ACID and isolation levels
Double-entry accounting
Idempotency
Concurrency and race conditions
Matching engine basics
Redis and Kafka/NATS
Security engineering
Blockchain transaction lifecycle
Monitoring and incident response
Financial reconciliation
```

Important technical concepts:

```text
Database transaction
SELECT FOR UPDATE
Idempotency key
Immutable ledger
Domain invariants
Event-driven architecture
Outbox pattern
Eventual consistency
Audit trail
Reconciliation
```

## Golden Rules

```text
Never use float for money.
Never update balance directly.
Every financial operation must be idempotent.
Every financial operation must run inside a database transaction.
Every ledger transaction must balance.
Every sensitive action must be auditable.
Every withdrawal must go through risk checks.
Every external event must be deduplicated.
Test concurrency before trusting the system.
```

## Practical Starting Path

```text
1. Modular monolith backend in Go
2. PostgreSQL + sqlc + migrations
3. Domain model
4. Ledger service
5. Wallet service
6. Simulated deposit/withdraw
7. Simple trading engine
8. WebSocket market data
9. Admin API
10. Security hardening
11. Real blockchain
12. Gold module
```

The practical starting point is the ledger. If the ledger is wrong, every later feature is financially unsafe.
