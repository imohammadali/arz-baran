package logger

import "testing"

func TestValidID(t *testing.T) {
	cases := []struct {
		id    string
		valid bool
	}{
		{"550e8400-e29b-41d4-a716-446655440000", true},
		{"req_123.abc", true},
		{"", false},
		{"has space", false},
		{"bad$id", false},
		{string(make([]byte, 129)), false},
	}

	for _, tc := range cases {
		if got := validID(tc.id); got != tc.valid {
			t.Fatalf("validID(%q) = %v, want %v", tc.id, got, tc.valid)
		}
	}
}

func TestNormalizeCorrelationID_FallsBackToRequestID(t *testing.T) {
	req := "req-abc-123"
	got := NormalizeCorrelationID("", req)
	if got != req {
		t.Fatalf("got %q, want %q", got, req)
	}
}

func TestNormalizeRequestID_GeneratesWhenInvalid(t *testing.T) {
	got := NormalizeRequestID("bad id!")
	if got == "bad id!" {
		t.Fatal("expected generated ID")
	}
	if !validID(got) {
		t.Fatalf("generated ID invalid: %q", got)
	}
}
