// Package domain holds the wallet/ledger bounded context's domain model:
// Account, LedgerEntry, Transaction, and Hold aggregates, domain events, and errors.
//
// Golden rules enforced here:
//   - All amounts use decimal.Decimal — never float.
//   - LedgerEntry.Amount is ALWAYS positive; Direction carries the sign.
//   - Transactions are immutable once Completed.
//   - Double-entry invariant: per asset, sum(credits) == sum(debits) per Transaction.
//
// No infrastructure, HTTP, or database dependencies are permitted in this package.
package domain
