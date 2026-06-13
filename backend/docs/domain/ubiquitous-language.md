# Ubiquitous Language

Terms used consistently across every layer of the exchange — domain code, database schema, API contracts, and team communication.

---

## Asset

A tradable or on-chain currency recognized by the exchange (e.g., BTC, USDT, ETH). An Asset is reference data owned by the Instrument context; it carries a ticker `Symbol`, a human-readable `Name`, and a `Decimals` precision that governs all quantity arithmetic for that asset.

## Instrument

A synonym for Asset when used in the context of the Instrument bounded context. The Instrument context owns the authoritative catalog of all Assets and TradingPairs.

## TradingPair

A relationship between two Assets — a `BaseAsset` and a `QuoteAsset` — that defines a market (e.g., BTC/USDT). A TradingPair specifies order-size constraints (`MinOrderSize`, `MaxOrderSize`) and the precision rules for price and quantity display.

## Account

A ledger account owned by a User (or the system) for a single Asset, scoped to a specific `AccountType` (`user`, `system`, `fee`, `insurance`). An Account has **no balance field** — its balance is always derived by summing its LedgerEntries.

## LedgerEntry

An immutable value object representing a single debit or credit line within a Transaction. The `Amount` is always strictly positive; `Direction` (debit/credit) carries the sign. LedgerEntries are never updated after insertion.

## Transaction

A balanced group of LedgerEntries that satisfy the double-entry invariant: for every Asset in the set, `sum(credits) == sum(debits)`. A Transaction starts `pending`, transitions to `completed` once all entries are persisted, and is immutable thereafter. A non-empty `IdempotencyKey` prevents duplicate processing.

## Hold

A reservation of funds on an Account that reduces the Available Balance without yet producing LedgerEntries. A Hold starts `active`, and transitions to either `released` (funds freed) or `settled` (converted into a real Transaction). Holds are created by the Ledger context before an Order is accepted by the matching engine.

## Order

A user's instruction to buy or sell a quantity of the base asset on a TradingPair at a given price (limit) or at market. An Order does not move money; it coordinates Holds. It progresses through: `pending → open → partially_filled / filled` or `cancelled`.

## Trade

An immutable record of a matched execution between a maker Order and a taker Order at an agreed price and quantity. A Trade is the trigger for settlement — it drives Hold settlement and LedgerEntry creation in the Wallet/Ledger context.

## Settlement

The process of converting a Trade into completed LedgerEntries: releasing or settling the relevant Holds and recording the exchange of funds between the buyer's and seller's Accounts via a balanced Transaction of type `trade_settlement`.

## Reconciliation

The periodic process of verifying that the sum of all posted balances across all Accounts (derived from LedgerEntries) equals the exchange's on-chain and custodian balances. Reconciliation is a read-only audit process that does not modify any domain state.

## Available Balance

A derived, read-only value: `posted_balance − sum(active_hold amounts)` for a given Account and Asset. It is never stored as a column; it is always computed on demand. Treating a cached Available Balance as a source of truth is a domain invariant violation.

## Locked Balance

The portion of a posted balance that is currently reserved by active Holds. `locked_balance = sum(active_hold amounts)` for a given Account and Asset.

## Deposit

An inflow of funds from an external blockchain address or payment rail into the exchange. A Deposit produces a `TxTypeDeposit` Transaction that credits the user's Account and debits a system treasury Account.

## Withdrawal

An outflow of funds from the exchange to an external address. A Withdrawal produces a `TxTypeWithdrawal` Transaction that debits the user's Account and credits a system treasury Account, and triggers an on-chain broadcast via the Blockchain context.

## Fee Account

A special Account of `AccountType = fee` that receives trading and withdrawal fees. Fee Accounts are system-owned; there is one per Asset.

## System Account

A special Account of `AccountType = system` used for internal exchange operations (e.g., treasury, float accounts). System Accounts are not associated with external users.

## Aggregate Root

A cluster of domain objects treated as a single unit for data changes. All modifications must go through the root; consistency invariants are enforced at the aggregate boundary. In this codebase: `User`, `Transaction`, `Order`.

## Domain Event

An immutable record of something that happened in the domain, named in the past tense (e.g., `UserRegistered`, `OrderFilled`). Events are recorded inside the Aggregate Root and dispatched after the transaction commits. They are the integration mechanism between bounded contexts.

## Idempotency Key

A client-supplied unique string that makes a mutation safe to retry without duplicating effects. The database enforces a `UNIQUE` constraint on `idempotency_key` columns in `transactions` and `holds`.
