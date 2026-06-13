package domain_test

import (
	"testing"
	"time"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	"github.com/imohammadali/arz-baran/backend/internal/module/iam/domain"
)

var (
	testNow  = time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	testHash = "$2a$12$somehashvalue"
)

func validEmail(t *testing.T) domain.Email {
	t.Helper()
	e, err := domain.NewEmail("user@example.com")
	if err != nil {
		t.Fatalf("unexpected error building valid email: %v", err)
	}
	return e
}

// --- Email value object ---

func TestNewEmail_Valid(t *testing.T) {
	e, err := domain.NewEmail("  User@Example.COM  ")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if e.String() != "user@example.com" {
		t.Errorf("expected normalized lowercase, got %q", e.String())
	}
}

func TestNewEmail_MissingAt(t *testing.T) {
	_, err := domain.NewEmail("notanemail")
	if err == nil {
		t.Fatal("expected error for email without '@'")
	}
}

func TestNewEmail_Empty(t *testing.T) {
	_, err := domain.NewEmail("   ")
	if err == nil {
		t.Fatal("expected error for empty email")
	}
}

// --- NewUser ---

func TestNewUser_HappyPath(t *testing.T) {
	id := kernel.NewID()
	u, err := domain.NewUser(id, validEmail(t), testHash, testNow)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if u.ID != id {
		t.Errorf("ID mismatch: want %v got %v", id, u.ID)
	}
	if u.Status != domain.UserStatusPendingVerification {
		t.Errorf("expected PendingVerification, got %v", u.Status)
	}
	if u.CreatedAt != testNow || u.UpdatedAt != testNow {
		t.Error("timestamps not set correctly")
	}

	events := u.Events()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].EventType() != "user.registered" {
		t.Errorf("expected user.registered, got %q", events[0].EventType())
	}
	if events[0].AggregateID() != id {
		t.Error("event aggregate ID mismatch")
	}
}

func TestNewUser_InvalidEmail(t *testing.T) {
	_, err := domain.NewEmail("bademail")
	if err == nil {
		t.Fatal("expected error for email without '@'")
	}
}

func TestNewUser_EmptyPasswordHash(t *testing.T) {
	id := kernel.NewID()
	_, err := domain.NewUser(id, validEmail(t), "", testNow)
	if err == nil {
		t.Fatal("expected error for empty password hash")
	}
	_, err = domain.NewUser(id, validEmail(t), "   ", testNow)
	if err == nil {
		t.Fatal("expected error for whitespace-only password hash")
	}
}

// --- Suspend / Activate state machine ---

func TestSuspend_ActiveUser(t *testing.T) {
	u, _ := domain.NewUser(kernel.NewID(), validEmail(t), testHash, testNow)
	_ = u.Activate(testNow) // move to Active first
	u.ClearEvents()

	later := testNow.Add(time.Hour)
	if err := u.Suspend(later); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u.Status != domain.UserStatusSuspended {
		t.Errorf("expected Suspended, got %v", u.Status)
	}
	if u.UpdatedAt != later {
		t.Error("UpdatedAt not updated on Suspend")
	}

	events := u.Events()
	if len(events) != 1 || events[0].EventType() != "user.suspended" {
		t.Errorf("expected user.suspended event, got %v", events)
	}
}

func TestSuspend_AlreadySuspended(t *testing.T) {
	u, _ := domain.NewUser(kernel.NewID(), validEmail(t), testHash, testNow)
	_ = u.Activate(testNow)
	_ = u.Suspend(testNow)
	u.ClearEvents()

	if err := u.Suspend(testNow); err == nil {
		t.Fatal("expected error when suspending already-suspended user")
	}
}

func TestActivate_SuspendedUser(t *testing.T) {
	u, _ := domain.NewUser(kernel.NewID(), validEmail(t), testHash, testNow)
	_ = u.Activate(testNow)
	_ = u.Suspend(testNow)
	u.ClearEvents()

	later := testNow.Add(time.Hour)
	if err := u.Activate(later); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u.Status != domain.UserStatusActive {
		t.Errorf("expected Active, got %v", u.Status)
	}

	events := u.Events()
	if len(events) != 1 || events[0].EventType() != "user.activated" {
		t.Errorf("expected user.activated event, got %v", events)
	}
}

func TestActivate_AlreadyActive(t *testing.T) {
	u, _ := domain.NewUser(kernel.NewID(), validEmail(t), testHash, testNow)
	_ = u.Activate(testNow)
	u.ClearEvents()

	if err := u.Activate(testNow); err == nil {
		t.Fatal("expected error when activating already-active user")
	}
}

func TestClearEvents(t *testing.T) {
	u, _ := domain.NewUser(kernel.NewID(), validEmail(t), testHash, testNow)
	if len(u.Events()) == 0 {
		t.Fatal("expected events before clear")
	}
	u.ClearEvents()
	if len(u.Events()) != 0 {
		t.Error("expected no events after ClearEvents")
	}
}
