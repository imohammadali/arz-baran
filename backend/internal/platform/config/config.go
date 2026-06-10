package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

const (
	defaultAppName         = "arz-baran"
	defaultAppEnv          = "development"
	defaultHTTPHost        = "0.0.0.0"
	defaultHTTPPort        = 1323
	defaultDatabaseURL     = "postgres://arz_baran:arz_baran@localhost:5432/arz_baran?sslmode=disable"
	defaultRedisURL        = "redis://localhost:6380/0"
	defaultMigrationsDir   = "migrations"
	defaultShutdownTimeout = 10 * time.Second
)

type Config struct {
	AppName  string
	AppEnv   string
	HTTPHost string
	HTTPPort int

	DatabaseURL   string
	RedisURL      string
	MigrationsDir string

	AutoMigrate bool

	ShutdownTimeout time.Duration
}

func Load() (Config, error) {
	_ = godotenv.Load()

	port, err := getenvInt("HTTP_PORT", defaultHTTPPort)
	if err != nil {
		return Config{}, fmt.Errorf("HTTP_PORT: %w", err)
	}

	autoMigrate, err := getenvBool("AUTO_MIGRATE", true)
	if err != nil {
		return Config{}, fmt.Errorf("AUTO_MIGRATE: %w", err)
	}

	shutdownSeconds, err := getenvInt("SHUTDOWN_TIMEOUT_SECONDS", int(defaultShutdownTimeout.Seconds()))
	if err != nil {
		return Config{}, fmt.Errorf("SHUTDOWN_TIMEOUT_SECONDS: %w", err)
	}

	cfg := Config{
		AppName:         getenv("APP_NAME", defaultAppName),
		AppEnv:          getenv("APP_ENV", defaultAppEnv),
		HTTPHost:        getenv("HTTP_HOST", defaultHTTPHost),
		HTTPPort:        port,
		DatabaseURL:     getenv("DATABASE_URL", defaultDatabaseURL),
		RedisURL:        getenv("REDIS_URL", defaultRedisURL),
		MigrationsDir:   getenv("MIGRATIONS_DIR", defaultMigrationsDir),
		AutoMigrate:     autoMigrate,
		ShutdownTimeout: time.Duration(shutdownSeconds) * time.Second,
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.RedisURL == "" {
		return Config{}, fmt.Errorf("REDIS_URL is required")
	}

	return cfg, nil
}

func (c Config) HTTPAddr() string {
	return fmt.Sprintf("%s:%d", c.HTTPHost, c.HTTPPort)
}

func (c Config) IsDevelopment() bool {
	return c.AppEnv == "development"
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getenvInt(key string, fallback int) (int, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, err
	}
	return parsed, nil
}

func getenvBool(key string, fallback bool) (bool, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, err
	}
	return parsed, nil
}
