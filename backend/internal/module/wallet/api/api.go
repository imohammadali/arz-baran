// Package api is the cross-module facade for wallet operations.
// Ledger implementation blocked until ADR-001 is approved.
package api

import (
	"context"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// PlaceHoldCommand reserves balance for a pending operation.
type PlaceHoldCommand struct {
	UserID         kernel.ID
	Asset          kernel.AssetID
	Amount         string
	CorrelationID  string
	IdempotencyKey string
}

// HoldID identifies a balance hold.
type HoldID kernel.ID

// ReleaseHoldCommand releases a previously placed hold.
type ReleaseHoldCommand struct {
	HoldID HoldID
}

// SettleCommand finalizes a hold into a ledger movement.
type SettleCommand struct {
	HoldID HoldID
}

// API is the wallet module boundary.
type API interface {
	PlaceHold(ctx context.Context, cmd PlaceHoldCommand) (HoldID, error)
	ReleaseHold(ctx context.Context, cmd ReleaseHoldCommand) error
	Settle(ctx context.Context, cmd SettleCommand) error
}
