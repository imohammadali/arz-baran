package domain

import "github.com/imohammadali/arz-baran/backend/internal/kernel"

const (
	CodeAssetNotFound    kernel.Code = "INSTRUMENT_ASSET_NOT_FOUND"
	CodeAssetDisabled    kernel.Code = "INSTRUMENT_ASSET_DISABLED"
	CodePairNotFound     kernel.Code = "INSTRUMENT_PAIR_NOT_FOUND"
	CodePairDisabled     kernel.Code = "INSTRUMENT_PAIR_DISABLED"
	CodeInvalidOrderSize kernel.Code = "INSTRUMENT_INVALID_ORDER_SIZE"
)

func ErrAssetNotFound() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleInstrument, CodeAssetNotFound, "asset not found")
}

func ErrAssetDisabled() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleInstrument, CodeAssetDisabled, "asset is disabled")
}

func ErrPairNotFound() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleInstrument, CodePairNotFound, "trading pair not found")
}

func ErrPairDisabled() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleInstrument, CodePairDisabled, "trading pair is disabled")
}

func ErrInvalidOrderSize(msg string) kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleInstrument, CodeInvalidOrderSize, msg)
}
