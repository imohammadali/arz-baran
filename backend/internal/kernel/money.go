package kernel

import "github.com/shopspring/decimal"

// Money represents a decimal monetary amount paired with an asset.
// Precision is determined by the Asset's declared decimal places.
type Money struct {
	Asset  AssetID
	Amount decimal.Decimal
}
