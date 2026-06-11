package kernel

import "fmt"

// Code is a stable machine-readable error identifier (e.g. WALLET_INSUFFICIENT_BALANCE).
type Code string

// Module identifies the originating bounded context.
type Module string

const (
	ModuleSystem     Module = "system"
	ModuleIAM        Module = "iam"
	ModuleWallet     Module = "wallet"
	ModuleInstrument Module = "instrument"
)

const (
	CodeInternalError          Code = "SYSTEM_INTERNAL_ERROR"
	CodeServiceUnavailable     Code = "SYSTEM_SERVICE_UNAVAILABLE"
	CodeValidationInvalidInput Code = "VALIDATION_INVALID_INPUT"
)

// Error is the root internal error contract.
type Error interface {
	error
	Code() Code
	Module() Module
	Message() string
	Retryable() bool
}

// DomainError represents a business rule violation.
type DomainError interface {
	Error
	IsDomainError()
}

// ApplicationError represents a use-case level failure.
type ApplicationError interface {
	Error
	IsApplicationError()
}

// InfrastructureError represents an adapter or dependency failure.
type InfrastructureError interface {
	Error
	IsInfrastructureError()
	Cause() error
}

// baseError provides shared fields for concrete error types.
type baseError struct {
	code      Code
	module    Module
	message   string
	retryable bool
}

func (e *baseError) Code() Code       { return e.code }
func (e *baseError) Module() Module   { return e.module }
func (e *baseError) Message() string  { return e.message }
func (e *baseError) Retryable() bool  { return e.retryable }
func (e *baseError) Error() string {
	return fmt.Sprintf("%s: %s", e.code, e.message)
}

// DomainErrorImpl is a placeholder concrete domain error.
type DomainErrorImpl struct {
	baseError
}

func (e *DomainErrorImpl) IsDomainError() {}

// ApplicationErrorImpl is a placeholder concrete application error.
type ApplicationErrorImpl struct {
	baseError
}

func (e *ApplicationErrorImpl) IsApplicationError() {}

// InfrastructureErrorImpl is a placeholder concrete infrastructure error.
type InfrastructureErrorImpl struct {
	baseError
	cause error
}

func (e *InfrastructureErrorImpl) IsInfrastructureError() {}
func (e *InfrastructureErrorImpl) Cause() error            { return e.cause }

// NewDomainError constructs a domain error with the given code and message.
func NewDomainError(module Module, code Code, message string) DomainError {
	return &DomainErrorImpl{baseError: baseError{code: code, module: module, message: message}}
}

// NewApplicationError constructs an application error with the given code and message.
func NewApplicationError(module Module, code Code, message string) ApplicationError {
	return &ApplicationErrorImpl{baseError: baseError{code: code, module: module, message: message}}
}

// NewInfrastructureError constructs an infrastructure error.
func NewInfrastructureError(module Module, code Code, message string, cause error, retryable bool) InfrastructureError {
	return &InfrastructureErrorImpl{
		baseError: baseError{code: code, module: module, message: message, retryable: retryable},
		cause:     cause,
	}
}
