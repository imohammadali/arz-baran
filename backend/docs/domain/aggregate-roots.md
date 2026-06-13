# Aggregate Roots

An Aggregate Root is the single entry point for all mutations within its consistency boundary. No external code may modify entities inside an aggregate except through the root's public methods.

| Aggregate     | Module  | Key Invariants |
|---------------|---------|----------------|
| **User**      | IAM     | 1. Email must contain `@` and be normalized to lowercase. <br>2. PasswordHash must be non-empty at construction. <br>3. A `Suspended` user cannot be suspended again. <br>4. An `Active` user cannot be activated again. <br>5. All state transitions emit a domain event. |
| **Transaction** | Wallet/Ledger | 1. `IdempotencyKey` must be non-empty and unique (enforced by DB `UNIQUE` constraint). <br>2. Every Transaction must have at least one LedgerEntry. <br>3. Double-entry invariant: for each `AssetID`, `sum(credits) == sum(debits)`. <br>4. Once `completed` or `reversed`, a Transaction is immutable — no further state transitions. <br>5. `Amount` on every LedgerEntry must be strictly positive. |
| **Order**     | Trading | 1. `Quantity` and `Price` (for limit orders) must be strictly positive. <br>2. `IdempotencyKey` must be non-empty. <br>3. `Fill(qty)` may only be called when status is `open` or `partially_filled`. <br>4. `qty` passed to `Fill` must not exceed `RemainingQty`. <br>5. A `filled` or `cancelled` Order cannot be cancelled again. <br>6. `Open()` may only be called when status is `pending`. |

---

## Why These Three — and Not Others

**Account** is _not_ an Aggregate Root in the current implementation, even though it was analysed as one during design. In Phase 0.5 the `Account` struct carries no balance field and enforces no balance invariant at the Go level — that invariant (`sum(active_holds) ≤ posted_balance`) is enforced by the service layer querying the database. Account will be promoted to a full AR in Phase 1 when the service layer gains in-memory hold tracking.

**Hold** is an entity (not an AR) because its lifecycle is fully governed by the Wallet service, not by user commands. Its state transitions (`Active → Released`, `Active → Settled`) are triggered by the service after validating business rules, with no need for an independent consistency boundary.

**Trade** is a value object. It is immutable from the moment of creation; it carries no behaviour and enforces no ongoing invariant.

**Asset** and **TradingPair** are reference data entities managed by an admin process. They have no runtime consistency boundaries that require AR protection.
