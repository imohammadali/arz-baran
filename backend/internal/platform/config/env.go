package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

func resolveString(src Source, key string) string {
	return strings.TrimSpace(src.Get(key))
}

func resolveStringDefault(src Source, key, fallback string) string {
	if v := resolveString(src, key); v != "" {
		return v
	}
	return fallback
}

func resolveSecret(src Source, key string) (string, error) {
	fileKey := key + "_FILE"
	if path := resolveString(src, fileKey); path != "" {
		data, err := os.ReadFile(path)
		if err != nil {
			return "", fmt.Errorf("%s: read file: %w", fileKey, err)
		}
		return strings.TrimSpace(string(data)), nil
	}
	return resolveString(src, key), nil
}

func resolveInt(src Source, key string, fallback int) (int, error) {
	v := resolveString(src, key)
	if v == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("%s: invalid integer %q", key, v)
	}
	return n, nil
}

func resolveInt64(src Source, key string, fallback int64) (int64, error) {
	v := resolveString(src, key)
	if v == "" {
		return fallback, nil
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%s: invalid integer %q", key, v)
	}
	return n, nil
}

func resolveBool(src Source, key string, fallback bool) (bool, error) {
	v := resolveString(src, key)
	if v == "" {
		return fallback, nil
	}
	switch strings.ToLower(v) {
	case "1", "true", "yes", "on":
		return true, nil
	case "0", "false", "no", "off":
		return false, nil
	default:
		return false, fmt.Errorf("%s: invalid boolean %q", key, v)
	}
}

func resolveDuration(src Source, key string, fallback time.Duration) (time.Duration, error) {
	v := resolveString(src, key)
	if v == "" {
		return fallback, nil
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return 0, fmt.Errorf("%s: invalid duration %q", key, v)
	}
	return d, nil
}

func resolveCSV(src Source, key string) []string {
	v := resolveString(src, key)
	if v == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func resolveEnvironment(src Source) (Environment, error) {
	v := resolveStringDefault(src, "APP_ENV", string(EnvDevelopment))
	env := Environment(v)
	switch env {
	case EnvDevelopment, EnvTest, EnvStaging, EnvProduction:
		return env, nil
	default:
		return "", fmt.Errorf("APP_ENV: invalid value %q", v)
	}
}
