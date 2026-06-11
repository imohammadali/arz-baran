package config

import "os"

// Source reads configuration key-value pairs.
// EnvSource is used in production; MapSource enables tests without mutating os.Environ.
type Source interface {
	Get(key string) string
}

// EnvSource reads from process environment variables.
type EnvSource struct{}

func (EnvSource) Get(key string) string {
	return os.Getenv(key)
}

// MapSource is an in-memory configuration source for tests.
type MapSource map[string]string

func (m MapSource) Get(key string) string {
	if m == nil {
		return ""
	}
	return m[key]
}
