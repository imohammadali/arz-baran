package store

import (
	"math/big"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/shopspring/decimal"
)

// TestDecimalNumericRoundtrip verifies that decimal → pgtype.Numeric → decimal
// is lossless for a representative set of values.
func TestDecimalNumericRoundtrip(t *testing.T) {
	cases := []string{
		"0",
		"1",
		"100",
		"100.5",
		"0.000000000000000001", // 1 wei (18 decimal places)
		"99999999999999999999.999999999999999999",
		"-50.25",
		"-0.000000000000000001",
		"0.00001", // BTC/USDT min order size
	}

	for _, tc := range cases {
		t.Run(tc, func(t *testing.T) {
			original, err := decimal.NewFromString(tc)
			if err != nil {
				t.Fatalf("decimal.NewFromString(%q): %v", tc, err)
			}

			n, err := decimalToNumeric(original)
			if err != nil {
				t.Fatalf("decimalToNumeric: %v", err)
			}

			result, err := numericToDecimal(n)
			if err != nil {
				t.Fatalf("numericToDecimal: %v", err)
			}

			if !original.Equal(result) {
				t.Errorf("roundtrip mismatch: input=%s got=%s", original, result)
			}
		})
	}
}

// TestNumericToDecimal_Null ensures a NULL (Valid=false) pgtype.Numeric returns zero.
func TestNumericToDecimal_Null(t *testing.T) {
	result, err := numericToDecimal(pgtype.Numeric{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.IsZero() {
		t.Errorf("expected zero for NULL numeric, got %s", result)
	}
}

// TestNumericToDecimal_NaN verifies that NaN returns an error.
func TestNumericToDecimal_NaN(t *testing.T) {
	n := pgtype.Numeric{NaN: true, Valid: true}
	_, err := numericToDecimal(n)
	if err == nil {
		t.Error("expected error for NaN numeric, got nil")
	}
}

// TestAnyNumericToDecimal covers the interface{} dispatch cases.
func TestAnyNumericToDecimal(t *testing.T) {
	t.Run("string", func(t *testing.T) {
		d, err := anyNumericToDecimal("123.456")
		if err != nil {
			t.Fatal(err)
		}
		want, _ := decimal.NewFromString("123.456")
		if !d.Equal(want) {
			t.Errorf("got %s, want %s", d, want)
		}
	})

	t.Run("bytes", func(t *testing.T) {
		d, err := anyNumericToDecimal([]byte("9.99"))
		if err != nil {
			t.Fatal(err)
		}
		want, _ := decimal.NewFromString("9.99")
		if !d.Equal(want) {
			t.Errorf("got %s, want %s", d, want)
		}
	})

	t.Run("pgtype.Numeric", func(t *testing.T) {
		var n pgtype.Numeric
		_ = n.Scan("42.0")
		d, err := anyNumericToDecimal(n)
		if err != nil {
			t.Fatal(err)
		}
		want, _ := decimal.NewFromString("42.0")
		if !d.Equal(want) {
			t.Errorf("got %s, want %s", d, want)
		}
	})

	t.Run("bigInt", func(t *testing.T) {
		d, err := anyNumericToDecimal(big.NewInt(1000))
		if err != nil {
			t.Fatal(err)
		}
		want := decimal.NewFromInt(1000)
		if !d.Equal(want) {
			t.Errorf("got %s, want %s", d, want)
		}
	})

	t.Run("nil", func(t *testing.T) {
		d, err := anyNumericToDecimal(nil)
		if err != nil {
			t.Fatal(err)
		}
		if !d.IsZero() {
			t.Errorf("expected zero for nil, got %s", d)
		}
	})

	t.Run("unknown type returns error", func(t *testing.T) {
		_, err := anyNumericToDecimal(struct{}{})
		if err == nil {
			t.Error("expected error for unknown type, got nil")
		}
	})
}
