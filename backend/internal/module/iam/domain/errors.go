package domain

import "github.com/imohammadali/arz-baran/backend/internal/kernel"

const (
	CodeUserNotFound        kernel.Code = "IAM_USER_NOT_FOUND"
	CodeUserAlreadyExists   kernel.Code = "IAM_USER_ALREADY_EXISTS"
	CodeUserSuspended       kernel.Code = "IAM_USER_SUSPENDED"
	CodeUserInvalidEmail    kernel.Code = "IAM_USER_INVALID_EMAIL"
	CodeUserInvalidPassword kernel.Code = "IAM_USER_INVALID_PASSWORD"
	CodeUserAlreadyActive   kernel.Code = "IAM_USER_ALREADY_ACTIVE"
)

// ErrUserNotFound returns a domain error for a missing user.
func ErrUserNotFound() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleIAM, CodeUserNotFound, "user not found")
}

// ErrUserAlreadyExists returns a domain error when a user with the same email exists.
func ErrUserAlreadyExists() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleIAM, CodeUserAlreadyExists, "user already exists")
}

// ErrUserSuspended returns a domain error when an operation is rejected because
// the user is suspended.
func ErrUserSuspended() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleIAM, CodeUserSuspended, "user is suspended")
}

// ErrUserInvalidEmail returns a domain error describing an email validation failure.
func ErrUserInvalidEmail(msg string) kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleIAM, CodeUserInvalidEmail, msg)
}

// ErrUserInvalidPassword returns a domain error when a password hash is missing or invalid.
func ErrUserInvalidPassword(msg string) kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleIAM, CodeUserInvalidPassword, msg)
}

// ErrUserAlreadyActive returns a domain error when activating a user that is already active.
func ErrUserAlreadyActive() kernel.DomainError {
	return kernel.NewDomainError(kernel.ModuleIAM, CodeUserAlreadyActive, "user is already active")
}
