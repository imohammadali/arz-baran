package kernel

// Money represents a decimal monetary amount paired with an asset.
// Implementation deferred until ADR-001 (ledger model) is approved.
type Money struct {
	Asset AssetID
	// Amount uses shopspring/decimal at implementation time.
	Amount string
}
