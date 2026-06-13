package domain

import (
	"time"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// AccountType classifies the purpose of an Account within the ledger.
type AccountType string

const (
	// AccountTypeUser is the primary spot balance account for an exchange user.
	AccountTypeUser AccountType = "user"
	// AccountTypeSystem is an internal exchange operational account.
	AccountTypeSystem AccountType = "system"
	// AccountTypeFee collects trading and withdrawal fees.
	AccountTypeFee AccountType = "fee"
	// AccountTypeInsurance backs the insurance / backstop fund.
	AccountTypeInsurance AccountType = "insurance"
)

// Account is a ledger account owned by a user or the system for a single asset.
// It has NO balance field — balance is always derived by summing its LedgerEntries.
type Account struct {
	ID        kernel.ID
	UserID    kernel.ID
	AssetID   kernel.AssetID
	Type      AccountType
	CreatedAt time.Time
}

// NewAccount constructs an Account.
func NewAccount(
	id kernel.ID,
	userID kernel.ID,
	assetID kernel.AssetID,
	accountType AccountType,
	now time.Time,
) *Account {
	return &Account{
		ID:        id,
		UserID:    userID,
		AssetID:   assetID,
		Type:      accountType,
		CreatedAt: now,
	}
}
