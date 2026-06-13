package domain

import (
	"strings"
	"time"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
)

// UserStatus represents the lifecycle state of a User.
type UserStatus string

const (
	UserStatusActive              UserStatus = "active"
	UserStatusSuspended           UserStatus = "suspended"
	UserStatusPendingVerification UserStatus = "pending_verification"
)

// Email is a value object wrapping a normalized, validated email address.
type Email struct {
	value string
}

// NewEmail constructs an Email, normalizing to lowercase and validating
// that the address is non-empty and contains exactly one "@".
func NewEmail(s string) (Email, error) {
	normalized := strings.ToLower(strings.TrimSpace(s))
	if normalized == "" {
		return Email{}, ErrUserInvalidEmail("email must not be empty")
	}
	if !strings.Contains(normalized, "@") {
		return Email{}, ErrUserInvalidEmail("email must contain '@'")
	}
	return Email{value: normalized}, nil
}

// String returns the normalized email address.
func (e Email) String() string { return e.value }

// User is the IAM aggregate root representing a registered platform identity.
type User struct {
	ID           kernel.ID
	Email        Email
	PasswordHash string
	Status       UserStatus
	CreatedAt    time.Time
	UpdatedAt    time.Time

	events []DomainEvent
}

// NewUser constructs a User in PendingVerification state and records a
// UserRegisteredEvent. passwordHash must be non-empty (caller is responsible
// for hashing before calling this constructor).
func NewUser(id kernel.ID, email Email, passwordHash string, now time.Time) (*User, error) {
	if strings.TrimSpace(passwordHash) == "" {
		return nil, kernel.NewDomainError(
			kernel.ModuleIAM,
			CodeUserNotFound, // reuse closest; a dedicated CodeUserInvalidPassword can be added later
			"password hash must not be empty",
		)
	}

	u := &User{
		ID:           id,
		Email:        email,
		PasswordHash: passwordHash,
		Status:       UserStatusPendingVerification,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	u.record(UserRegisteredEvent{baseEvent{aggregateID: id, occurredAt: now}})
	return u, nil
}

// Suspend transitions the User to Suspended. Returns an error if already Suspended.
func (u *User) Suspend(now time.Time) error {
	if u.Status == UserStatusSuspended {
		return kernel.NewDomainError(kernel.ModuleIAM, CodeUserSuspended, "user is already suspended")
	}
	u.Status = UserStatusSuspended
	u.UpdatedAt = now
	u.record(UserSuspendedEvent{baseEvent{aggregateID: u.ID, occurredAt: now}})
	return nil
}

// Activate transitions the User to Active. Returns an error if already Active.
func (u *User) Activate(now time.Time) error {
	if u.Status == UserStatusActive {
		return kernel.NewDomainError(kernel.ModuleIAM, CodeUserSuspended, "user is already active")
	}
	u.Status = UserStatusActive
	u.UpdatedAt = now
	u.record(UserActivatedEvent{baseEvent{aggregateID: u.ID, occurredAt: now}})
	return nil
}

// Events returns the uncommitted domain events accumulated since the last ClearEvents call.
func (u *User) Events() []DomainEvent { return u.events }

// ClearEvents discards all accumulated domain events after they have been dispatched.
func (u *User) ClearEvents() { u.events = nil }

func (u *User) record(e DomainEvent) {
	u.events = append(u.events, e)
}
