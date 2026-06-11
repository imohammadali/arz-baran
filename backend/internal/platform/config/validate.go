package config

import (
	"fmt"
	"os"
	"strings"
)

// Binary identifies which process loads configuration (validation subset).
type Binary string

const (
	BinaryAPI Binary = "api"
)

// ValidationErrors aggregates configuration validation failures.
type ValidationErrors []error

func (e ValidationErrors) Error() string {
	if len(e) == 0 {
		return ""
	}
	msgs := make([]string, len(e))
	for i, err := range e {
		msgs[i] = err.Error()
	}
	return "config validation failed:\n  - " + strings.Join(msgs, "\n  - ")
}

// Validate applies rules for the API binary.
func (c Config) Validate() error {
	return c.ValidateFor(BinaryAPI)
}

// ValidateFor applies environment- and binary-specific validation rules.
func (c Config) ValidateFor(binary Binary) error {
	var errs ValidationErrors

	errs = append(errs, c.validateMeta()...)
	errs = append(errs, c.validateServer()...)
	errs = append(errs, c.validatePostgres()...)
	errs = append(errs, c.validateRedis()...)
	errs = append(errs, c.validateJWT()...)
	errs = append(errs, c.validateLogging()...)
	errs = append(errs, c.validateFeatures()...)
	errs = append(errs, c.validateSecurity()...)

	switch binary {
	case BinaryAPI:
		errs = append(errs, c.validateAPI()...)
	default:
		errs = append(errs, fmt.Errorf("binary: unknown profile %q", binary))
	}

	if len(errs) > 0 {
		return errs
	}
	return nil
}

func (c Config) validateMeta() []error {
	var errs []error
	if c.Meta.ServiceName == "" {
		errs = append(errs, fmt.Errorf("LOG_SERVICE_NAME: required"))
	}
	return errs
}

func (c Config) validateServer() []error {
	var errs []error
	if c.Server.Port < 1 || c.Server.Port > 65535 {
		errs = append(errs, fmt.Errorf("SERVER_PORT: must be between 1 and 65535"))
	}
	if c.Server.ShutdownTimeout <= 0 {
		errs = append(errs, fmt.Errorf("SERVER_SHUTDOWN_TIMEOUT: must be positive"))
	}
	if c.Server.MaxBodyBytes <= 0 {
		errs = append(errs, fmt.Errorf("SERVER_MAX_BODY_BYTES: must be positive"))
	}
	if isStrictEnv(c.Meta.Env) && len(c.Server.CORSOrigins) == 0 {
		errs = append(errs, fmt.Errorf("SERVER_CORS_ORIGINS: required in %s", c.Meta.Env))
	}
	return errs
}

func (c Config) validatePostgres() []error {
	var errs []error
	if c.Postgres.Host == "" {
		errs = append(errs, fmt.Errorf("POSTGRES_HOST: required"))
	}
	if c.Postgres.User == "" {
		errs = append(errs, fmt.Errorf("POSTGRES_USER: required"))
	}
	if c.Postgres.Database == "" {
		errs = append(errs, fmt.Errorf("POSTGRES_DB: required"))
	}
	if c.Postgres.MaxOpenConns < 1 {
		errs = append(errs, fmt.Errorf("POSTGRES_MAX_OPEN_CONNS: must be at least 1"))
	}
	if c.Postgres.MaxIdleConns < 0 {
		errs = append(errs, fmt.Errorf("POSTGRES_MAX_IDLE_CONNS: must be non-negative"))
	}
	if c.Postgres.MaxIdleConns > c.Postgres.MaxOpenConns {
		errs = append(errs, fmt.Errorf("POSTGRES_MAX_IDLE_CONNS: must not exceed POSTGRES_MAX_OPEN_CONNS"))
	}
	if c.Postgres.ConnectTimeout <= 0 {
		errs = append(errs, fmt.Errorf("POSTGRES_CONNECT_TIMEOUT: must be positive"))
	}

	if isStrictEnv(c.Meta.Env) {
		if c.Postgres.Password == "" {
			errs = append(errs, fmt.Errorf("POSTGRES_PASSWORD: required in %s", c.Meta.Env))
		}
		if c.Postgres.SSLMode == "disable" {
			errs = append(errs, fmt.Errorf("POSTGRES_SSLMODE=disable: not allowed in %s", c.Meta.Env))
		}
	}
	return errs
}

func (c Config) validateRedis() []error {
	var errs []error
	if c.Redis.Addr == "" {
		errs = append(errs, fmt.Errorf("REDIS_ADDR: required"))
	}
	if c.Redis.KeyPrefix == "" {
		errs = append(errs, fmt.Errorf("REDIS_KEY_PREFIX: required"))
	}
	if isStrictEnv(c.Meta.Env) {
		if c.Redis.Password == "" {
			errs = append(errs, fmt.Errorf("REDIS_PASSWORD: required in %s", c.Meta.Env))
		}
		if !c.Redis.TLSEnabled && c.Meta.Env == EnvProduction {
			errs = append(errs, fmt.Errorf("REDIS_TLS_ENABLED: must be true in production"))
		}
	}
	return errs
}

func (c Config) validateJWT() []error {
	var errs []error
	if c.JWT.AccessTTL <= 0 {
		errs = append(errs, fmt.Errorf("JWT_ACCESS_TTL: must be positive"))
	}
	if c.JWT.RefreshTTL <= 0 {
		errs = append(errs, fmt.Errorf("JWT_REFRESH_TTL: must be positive"))
	}
	if c.JWT.RefreshTTL <= c.JWT.AccessTTL {
		errs = append(errs, fmt.Errorf("JWT_REFRESH_TTL: must be greater than JWT_ACCESS_TTL"))
	}
	if c.JWT.Algorithm != "" && c.JWT.Algorithm != "RS256" && c.JWT.Algorithm != "HS256" {
		errs = append(errs, fmt.Errorf("JWT_ALGORITHM: must be RS256 or HS256"))
	}

	if isStrictEnv(c.Meta.Env) {
		if c.JWT.Issuer == "" {
			errs = append(errs, fmt.Errorf("JWT_ISSUER: required in %s", c.Meta.Env))
		}
		if c.JWT.Audience == "" {
			errs = append(errs, fmt.Errorf("JWT_AUDIENCE: required in %s", c.Meta.Env))
		}
		if c.JWT.Algorithm == "RS256" {
			if c.JWT.PublicKeyPath == "" {
				errs = append(errs, fmt.Errorf("JWT_PUBLIC_KEY_FILE: required in %s when JWT_ALGORITHM=RS256", c.Meta.Env))
			} else if err := fileExists(c.JWT.PublicKeyPath); err != nil {
				errs = append(errs, fmt.Errorf("JWT_PUBLIC_KEY_FILE: %w", err))
			}
			if c.JWT.PrivateKeyPath == "" {
				errs = append(errs, fmt.Errorf("JWT_PRIVATE_KEY_FILE: required in %s when JWT_ALGORITHM=RS256", c.Meta.Env))
			} else if err := fileExists(c.JWT.PrivateKeyPath); err != nil {
				errs = append(errs, fmt.Errorf("JWT_PRIVATE_KEY_FILE: %w", err))
			}
		}
		if c.JWT.Algorithm == "HS256" && c.JWT.Secret == "" {
			errs = append(errs, fmt.Errorf("JWT_SECRET: required in %s when JWT_ALGORITHM=HS256", c.Meta.Env))
		}
		if c.JWT.AdminIssuer != "" && c.JWT.AdminIssuer == c.JWT.Issuer {
			errs = append(errs, fmt.Errorf("JWT_ADMIN_ISSUER: must differ from JWT_ISSUER"))
		}
	}
	return errs
}

func (c Config) validateLogging() []error {
	var errs []error
	switch c.Logging.Level {
	case "debug", "info", "warn", "error":
	default:
		errs = append(errs, fmt.Errorf("LOG_LEVEL: must be debug, info, warn, or error"))
	}
	switch c.Logging.Format {
	case "json", "text":
	default:
		errs = append(errs, fmt.Errorf("LOG_FORMAT: must be json or text"))
	}
	if isStrictEnv(c.Meta.Env) && c.Logging.Format != "json" {
		errs = append(errs, fmt.Errorf("LOG_FORMAT: must be json in %s", c.Meta.Env))
	}
	return errs
}

func (c Config) validateFeatures() []error {
	return nil
}

func (c Config) validateSecurity() []error {
	var errs []error
	if c.Security.IdempotencyTTL <= 0 {
		errs = append(errs, fmt.Errorf("SECURITY_IDEMPOTENCY_TTL: must be positive"))
	}
	return errs
}

func (c Config) validateAPI() []error {
	return nil
}

func isStrictEnv(env Environment) bool {
	return env == EnvStaging || env == EnvProduction
}

func fileExists(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if info.IsDir() {
		return fmt.Errorf("path is a directory")
	}
	return nil
}
