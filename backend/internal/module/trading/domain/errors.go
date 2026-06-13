package domain

import "github.com/imohammadali/arz-baran/backend/internal/kernel"

const (
	CodeOrderNotFound      kernel.Code = "TRADING_ORDER_NOT_FOUND"
	CodeOrderNotOpen       kernel.Code = "TRADING_ORDER_NOT_OPEN"
	CodeOrderAlreadyFilled kernel.Code = "TRADING_ORDER_ALREADY_FILLED"
	CodeInvalidOrderPrice  kernel.Code = "TRADING_INVALID_ORDER_PRICE"
	CodeInvalidOrderQty    kernel.Code = "TRADING_INVALID_ORDER_QTY"
)

func ErrOrderNotFound() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleSystem, CodeOrderNotFound, "order not found")
}

func ErrOrderNotOpen() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleSystem, CodeOrderNotOpen, "order is not open")
}

func ErrOrderAlreadyFilled() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleSystem, CodeOrderAlreadyFilled, "order is already filled")
}

func ErrInvalidOrderPrice(msg string) kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleSystem, CodeInvalidOrderPrice, msg)
}

func ErrInvalidOrderQty(msg string) kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleSystem, CodeInvalidOrderQty, msg)
}
