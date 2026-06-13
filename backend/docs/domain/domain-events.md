# Domain Events

Domain events are immutable records of things that happened. They are collected inside an Aggregate Root during a command and dispatched after the database transaction commits.

All events implement the `DomainEvent` interface:
```go
type DomainEvent interface {
    EventType()  string
    OccurredAt() time.Time
    AggregateID() kernel.ID
}
```

---

## IAM Events

| Event | Event Type String | Published By | Key Payload Fields | Future Consumers |
|---|---|---|---|---|
| `UserRegisteredEvent` | `user.registered` | `User.NewUser` | `AggregateID` (UserID), `OccurredAt` | Wallet (create default accounts), KYC (trigger verification), Notification |
| `UserSuspendedEvent` | `user.suspended` | `User.Suspend` | `AggregateID` (UserID), `OccurredAt` | Session (invalidate sessions), Notification |
| `UserActivatedEvent` | `user.activated` | `User.Activate` | `AggregateID` (UserID), `OccurredAt` | Notification |

---

## Wallet / Ledger Events

| Event | Event Type String | Published By | Key Payload Fields | Future Consumers |
|---|---|---|---|---|
| `BalanceHeldEvent` | `wallet.balance_held` | Hold creation in service | `AggregateID` (AccountID), `HoldID`, `OccurredAt` | Trading (confirm hold placed, proceed to matching engine) |
| `HoldReleasedEvent` | `wallet.hold_released` | `Hold.Release` | `AggregateID` (AccountID), `HoldID`, `OccurredAt` | Trading (notify order cancelled / rejected) |
| `HoldSettledEvent` | `wallet.hold_settled` | `Hold.Settle` | `AggregateID` (AccountID), `HoldID`, `OccurredAt` | Trading (confirm settlement, close the trade saga) |
| `TransactionCompletedEvent` | `wallet.transaction_completed` | `Transaction.Complete` | `AggregateID` (TransactionID), `TransactionID`, `OccurredAt` | Treasury (reconciliation), Reporting, Notification (deposit/withdrawal confirmed) |

---

## Trading Events

| Event | Event Type String | Published By | Key Payload Fields | Future Consumers |
|---|---|---|---|---|
| `OrderPlacedEvent` | `trading.order_placed` | `NewLimitOrder` / `NewMarketOrder` | `AggregateID` (OrderID), `OccurredAt` | Wallet (place hold), Risk engine |
| `OrderOpenedEvent` | `trading.order_opened` | `Order.Open` | `AggregateID` (OrderID), `OccurredAt` | Matching engine (add to order book), Market Data (order book update) |
| `OrderPartiallyFilledEvent` | `trading.order_partially_filled` | `Order.Fill` (partial) | `AggregateID` (OrderID), `FilledQty` (string), `OccurredAt` | Market Data (last price update), Notification |
| `OrderFilledEvent` | `trading.order_filled` | `Order.Fill` (full) | `AggregateID` (OrderID), `OccurredAt` | Wallet (settle holds, create transaction), Notification |
| `OrderCancelledEvent` | `trading.order_cancelled` | `Order.Cancel` | `AggregateID` (OrderID), `OccurredAt` | Wallet (release hold), Matching engine (remove from order book), Notification |
| `TradeExecutedEvent` | `trading.trade_executed` | Trade creation in matching service | `AggregateID` (MakerOrderID), `TradeID`, `OccurredAt` | Wallet (settlement saga), Market Data (trades feed, OHLCV), Reporting |

---

## Instrument Events

No domain events are published by the Instrument context in Phase 0.5. Asset and TradingPair mutations are admin operations with no downstream reactive consumers at this stage.

_Phase 3 candidate:_ `AssetDisabledEvent` → Trading (cancel open orders for that asset), Wallet (freeze new deposits).

---

## Scalability Notes

- Events are currently collected in-memory and must be dispatched transactionally (outbox pattern) in Phase 1 to avoid lost events on crash.
- `FilledQty` in `OrderPartiallyFilledEvent` is a `string` (decimal string representation) to avoid float serialization issues.
- Each event carries only the minimum payload needed to route it; consumers must re-query the aggregate if they need full state.
