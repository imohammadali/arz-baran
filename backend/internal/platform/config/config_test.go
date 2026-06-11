package config_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/imohammadali/arz-baran/backend/internal/platform/config"
)

func TestLoadFrom_DevelopmentDefaults(t *testing.T) {
	cfg, err := config.LoadFrom(config.MapSource{
		"APP_ENV": "development",
	})
	if err != nil {
		t.Fatalf("LoadFrom: %v", err)
	}

	if cfg.Meta.Env != config.EnvDevelopment {
		t.Fatalf("env: got %q", cfg.Meta.Env)
	}
	if cfg.Logging.Level != "debug" {
		t.Fatalf("log level: got %q", cfg.Logging.Level)
	}
	if cfg.Logging.Format != "text" {
		t.Fatalf("log format: got %q", cfg.Logging.Format)
	}
	if cfg.Postgres.SSLMode != "disable" {
		t.Fatalf("sslmode: got %q", cfg.Postgres.SSLMode)
	}
	if !cfg.Postgres.RunMigrations {
		t.Fatal("expected run migrations in development")
	}
	if cfg.JWT.Algorithm != "HS256" {
		t.Fatalf("jwt algorithm: got %q", cfg.JWT.Algorithm)
	}
}

func TestLoadFrom_SecretFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "pg_password")
	if err := os.WriteFile(path, []byte("secret-from-file\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	cfg, err := config.LoadFrom(config.MapSource{
		"APP_ENV":                "development",
		"POSTGRES_PASSWORD_FILE": path,
	})
	if err != nil {
		t.Fatalf("LoadFrom: %v", err)
	}
	if cfg.Postgres.Password != "secret-from-file" {
		t.Fatalf("password: got %q", cfg.Postgres.Password)
	}
}

func TestLoadFrom_ParseErrorsAggregated(t *testing.T) {
	_, err := config.LoadFrom(config.MapSource{
		"APP_ENV":      "development",
		"SERVER_PORT":  "not-a-port",
		"LOG_LEVEL":    "verbose",
		"JWT_ACCESS_TTL": "15m",
		"JWT_REFRESH_TTL": "5m",
	})
	if err == nil {
		t.Fatal("expected error")
	}
	msg := err.Error()
	for _, want := range []string{"SERVER_PORT", "LOG_LEVEL", "JWT_REFRESH_TTL"} {
		if !strings.Contains(msg, want) {
			t.Fatalf("error %q missing %q", msg, want)
		}
	}
}

func TestLoadFrom_ProductionRequiresStrictSettings(t *testing.T) {
	_, err := config.LoadFrom(config.MapSource{
		"APP_ENV":            "production",
		"POSTGRES_PASSWORD":  "pw",
		"POSTGRES_SSLMODE":   "disable",
		"REDIS_PASSWORD":     "pw",
		"SERVER_CORS_ORIGINS": "https://example.com",
		"JWT_ISSUER":         "exchange",
		"JWT_AUDIENCE":       "exchange-users",
		"JWT_ALGORITHM":      "HS256",
	})
	if err == nil {
		t.Fatal("expected validation error")
	}
	msg := err.Error()
	if !strings.Contains(msg, "POSTGRES_SSLMODE") {
		t.Fatalf("missing sslmode error: %s", msg)
	}
	if !strings.Contains(msg, "JWT_SECRET") {
		t.Fatalf("missing jwt secret error: %s", msg)
	}
}

func TestLoadFrom_ProductionRS256RequiresKeyFiles(t *testing.T) {
	dir := t.TempDir()
	pub := filepath.Join(dir, "jwt.pub")
	priv := filepath.Join(dir, "jwt.key")
	if err := os.WriteFile(pub, []byte("public"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(priv, []byte("private"), 0o600); err != nil {
		t.Fatal(err)
	}

	cfg, err := config.LoadFrom(config.MapSource{
		"APP_ENV":               "production",
		"POSTGRES_PASSWORD":     "pw",
		"POSTGRES_SSLMODE":      "require",
		"REDIS_PASSWORD":        "pw",
		"REDIS_TLS_ENABLED":     "true",
		"SERVER_CORS_ORIGINS":   "https://example.com",
		"JWT_ISSUER":            "exchange",
		"JWT_AUDIENCE":          "exchange-users",
		"JWT_ALGORITHM":         "RS256",
		"JWT_PUBLIC_KEY_FILE":   pub,
		"JWT_PRIVATE_KEY_FILE":  priv,
	})
	if err != nil {
		t.Fatalf("LoadFrom: %v", err)
	}
	if cfg.JWT.PublicKeyPath != pub {
		t.Fatalf("public key path: got %q", cfg.JWT.PublicKeyPath)
	}
}

func TestPostgres_DSN_EncodesSpecialCharacters(t *testing.T) {
	dsn := config.Postgres{
		User:     "exchange",
		Password: "p@ss:word",
		Host:     "localhost",
		Port:     5432,
		Database: "exchange",
		SSLMode:  "disable",
	}.DSN()

	if !strings.Contains(dsn, "p%40ss%3Aword") {
		t.Fatalf("expected encoded password in DSN, got %q", dsn)
	}
}

func TestConfig_SafeSummary_RedactsSecrets(t *testing.T) {
	cfg, err := config.LoadFrom(config.MapSource{
		"APP_ENV":           "development",
		"POSTGRES_PASSWORD": "super-secret",
		"REDIS_PASSWORD":    "redis-secret",
		"JWT_SECRET":        "jwt-secret",
	})
	if err != nil {
		t.Fatalf("LoadFrom: %v", err)
	}

	summary := cfg.SafeSummary()
	for _, secret := range []string{"super-secret", "redis-secret", "jwt-secret"} {
		if strings.Contains(summary, secret) {
			t.Fatalf("summary leaks secret %q: %s", secret, summary)
		}
	}
}

func TestValidateFor_UnknownBinary(t *testing.T) {
	cfg := config.MustLoad(config.MapSource{"APP_ENV": "development"})
	err := cfg.ValidateFor(config.Binary("worker"))
	if err == nil || !strings.Contains(err.Error(), "binary") {
		t.Fatalf("expected binary error, got %v", err)
	}
}
