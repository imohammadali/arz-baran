package domain

import "github.com/imohammadali/arz-baran/backend/internal/kernel"

const (
	CodeInsufficientBalance     kernel.Code = "WALLET_INSUFFICIENT_BALANCE"
	CodeAccountNotFound         kernel.Code = "WALLET_ACCOUNT_NOT_FOUND"
	CodeHoldNotFound            kernel.Code = "WALLET_HOLD_NOT_FOUND"
	CodeHoldAlreadySettled      kernel.Code = "WALLET_HOLD_ALREADY_SETTLED"
	CodeDuplicateIdempotencyKey kernel.Code = "WALLET_DUPLICATE_IDEMPOTENCY_KEY"
	CodeUnbalancedTransaction   kernel.Code = "WALLET_UNBALANCED_TRANSACTION"
)

func ErrInsufficientBalance() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleWallet, CodeInsufficientBalance, "insufficient balance")
}

func ErrAccountNotFound() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleWallet, CodeAccountNotFound, "account not found")
}

func ErrHoldNotFound() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleWallet, CodeHoldNotFound, "hold not found")
}

func ErrHoldAlreadySettled() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleWallet, CodeHoldAlreadySettled, "hold is already settled")
}

func ErrDuplicateIdempotencyKey() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleWallet, CodeDuplicateIdempotencyKey, "duplicate idempotency key")
}

func ErrUnbalancedTransaction(msg string) kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleWallet, CodeUnbalancedTransaction, msg)
}
