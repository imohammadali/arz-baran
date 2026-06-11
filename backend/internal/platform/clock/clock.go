// Package clock provides time abstraction for testability.
package clock

import "time"

// Clock abstracts time for domain and application layers.
type Clock interface {
	Now() time.Time
}

// SystemClock uses the real system clock.
type SystemClock struct{}

func (SystemClock) Now() time.Time { return time.Now() }
