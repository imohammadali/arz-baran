package migrate

import "testing"

func TestDefaultDir(t *testing.T) {
	if DefaultDir != "migrations" {
		t.Fatalf("DefaultDir = %q, want migrations", DefaultDir)
	}
}
