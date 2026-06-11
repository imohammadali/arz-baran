// Package config loads and validates environment-based configuration.
package config

import (
	"fmt"
	"time"
)

// Environment identifies the runtime profile.
type Environment string

const (
	EnvDevelopment Environment = "development"
	EnvTest        Environment = "test"
	EnvStaging     Environment = "staging"
	EnvProduction  Environment = "production"
)

// Config is the immutable application configuration loaded at startup.
type Config struct {
	Meta     Meta
	Server   Server
	Postgres Postgres
	Redis    Redis
	JWT      JWT
	Logging  Logging
	Features Features
	Security Security
}

// Meta holds process identity.
type Meta struct {
	Env         Environment
	ServiceName string
	Version     string
}

// Server holds HTTP server settings.
type Server struct {
	Host            string
	Port            int
	PublicURL       string
	ShutdownTimeout time.Duration
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	MaxBodyBytes    int64
	TrustedProxies  []string
	CORSOrigins     []string
}

// Postgres holds primary database connection settings.
type Postgres struct {
	Host              string
	Port              int
	User              string
	Password          string
	Database          string
	SSLMode           string
	RunMigrations     bool
	MaxOpenConns      int
	MaxIdleConns      int
	ConnectTimeout    time.Duration
	StatementTimeout  time.Duration
}

// Redis holds cache and coordination backend settings.
type Redis struct {
	Addr       string
	Password   string
	KeyPrefix  string
	TLSEnabled bool
}

// JWT holds token issuance and verification settings.
type JWT struct {
	AccessTTL           time.Duration
	RefreshTTL          time.Duration
	Issuer              string
	Audience            string
	AdminIssuer         string
	Algorithm           string
	Secret              string
	PrivateKeyPath      string
	PublicKeyPath       string
	AdminPrivateKeyPath string
}

// Logging holds application log output settings.
type Logging struct {
	Level          string
	Format         string
	VerboseModules []string
}

// Features holds operational feature flags.
type Features struct {
	MaintenanceMode     bool
	RegistrationEnabled bool
	DepositEnabled      bool
	WithdrawalEnabled   bool
}

// Security holds global security-related settings.
type Security struct {
	IdempotencyTTL time.Duration
}

// Load reads configuration from the process environment.
func Load() (Config, error) {
	return LoadFrom(EnvSource{})
}

// LoadFrom parses and validates configuration from the given source.
// Parse and validation errors are aggregated so callers see every failure at once.
func LoadFrom(src Source) (Config, error) {
	cfg, err := parse(src)

	var all ValidationErrors
	appendErrs(&all, err)
	appendErrs(&all, cfg.Validate())

	if len(all) > 0 {
		return Config{}, all
	}
	return cfg, nil
}

func appendErrs(all *ValidationErrors, err error) {
	if err == nil {
		return
	}
	if ve, ok := err.(ValidationErrors); ok {
		*all = append(*all, ve...)
		return
	}
	*all = append(*all, err)
}

func parse(src Source) (Config, error) {
	var errs ValidationErrors

	env, err := resolveEnvironment(src)
	if err != nil {
		errs = append(errs, err)
		env = EnvDevelopment
	}

	readTO, writeTO, idleTO := defaultServerTimeouts()

	cfg := Config{
		Meta: Meta{
			Env:         env,
			ServiceName: resolveStringDefault(src, "LOG_SERVICE_NAME", "exchange-api"),
			Version:     resolveStringDefault(src, "APP_VERSION", "dev"),
		},
	}

	// Server
	cfg.Server.Host = resolveStringDefault(src, "SERVER_HOST", "0.0.0.0")
	cfg.Server.PublicURL = resolveStringDefault(src, "SERVER_PUBLIC_URL", "http://localhost:8080")
	cfg.Server.TrustedProxies = resolveCSV(src, "SERVER_TRUSTED_PROXIES")
	cfg.Server.CORSOrigins = resolveCSV(src, "SERVER_CORS_ORIGINS")

	if cfg.Server.Port, err = resolveInt(src, "SERVER_PORT", 8080); err != nil {
		errs = append(errs, err)
	}
	if cfg.Server.ShutdownTimeout, err = resolveDuration(src, "SERVER_SHUTDOWN_TIMEOUT", 30*time.Second); err != nil {
		errs = append(errs, err)
	}
	if cfg.Server.ReadTimeout, err = resolveDuration(src, "SERVER_READ_TIMEOUT", readTO); err != nil {
		errs = append(errs, err)
	}
	if cfg.Server.WriteTimeout, err = resolveDuration(src, "SERVER_WRITE_TIMEOUT", writeTO); err != nil {
		errs = append(errs, err)
	}
	if cfg.Server.IdleTimeout, err = resolveDuration(src, "SERVER_IDLE_TIMEOUT", idleTO); err != nil {
		errs = append(errs, err)
	}
	if cfg.Server.MaxBodyBytes, err = resolveInt64(src, "SERVER_MAX_BODY_BYTES", 1<<20); err != nil {
		errs = append(errs, err)
	}

	// Postgres
	cfg.Postgres.Host = resolveStringDefault(src, "POSTGRES_HOST", "localhost")
	cfg.Postgres.User = resolveStringDefault(src, "POSTGRES_USER", "exchange")
	cfg.Postgres.Database = resolveStringDefault(src, "POSTGRES_DB", "exchange")
	cfg.Postgres.SSLMode = resolveStringDefault(src, "POSTGRES_SSLMODE", defaultPostgresSSLMode(env))

	if cfg.Postgres.Port, err = resolveInt(src, "POSTGRES_PORT", 5432); err != nil {
		errs = append(errs, err)
	}
	if cfg.Postgres.Password, err = resolveSecret(src, "POSTGRES_PASSWORD"); err != nil {
		errs = append(errs, err)
	}
	if cfg.Postgres.RunMigrations, err = resolveBool(src, "POSTGRES_RUN_MIGRATIONS", defaultRunMigrations(env)); err != nil {
		errs = append(errs, err)
	}
	if cfg.Postgres.MaxOpenConns, err = resolveInt(src, "POSTGRES_MAX_OPEN_CONNS", 20); err != nil {
		errs = append(errs, err)
	}
	if cfg.Postgres.MaxIdleConns, err = resolveInt(src, "POSTGRES_MAX_IDLE_CONNS", 5); err != nil {
		errs = append(errs, err)
	}
	if cfg.Postgres.ConnectTimeout, err = resolveDuration(src, "POSTGRES_CONNECT_TIMEOUT", 10*time.Second); err != nil {
		errs = append(errs, err)
	}
	if cfg.Postgres.StatementTimeout, err = resolveDuration(src, "POSTGRES_STATEMENT_TIMEOUT", 30*time.Second); err != nil {
		errs = append(errs, err)
	}

	// Redis
	cfg.Redis.Addr = resolveStringDefault(src, "REDIS_ADDR", "localhost:6379")
	cfg.Redis.KeyPrefix = resolveStringDefault(src, "REDIS_KEY_PREFIX", "arz:")
	if cfg.Redis.Password, err = resolveSecret(src, "REDIS_PASSWORD"); err != nil {
		errs = append(errs, err)
	}
	if cfg.Redis.TLSEnabled, err = resolveBool(src, "REDIS_TLS_ENABLED", false); err != nil {
		errs = append(errs, err)
	}

	// JWT
	cfg.JWT.Issuer = resolveString(src, "JWT_ISSUER")
	cfg.JWT.Audience = resolveString(src, "JWT_AUDIENCE")
	cfg.JWT.AdminIssuer = resolveString(src, "JWT_ADMIN_ISSUER")
	cfg.JWT.Algorithm = resolveStringDefault(src, "JWT_ALGORITHM", defaultJWTAlgorithm(env))
	cfg.JWT.PrivateKeyPath = resolveString(src, "JWT_PRIVATE_KEY_FILE")
	cfg.JWT.PublicKeyPath = resolveString(src, "JWT_PUBLIC_KEY_FILE")
	cfg.JWT.AdminPrivateKeyPath = resolveString(src, "JWT_ADMIN_PRIVATE_KEY_FILE")

	if cfg.JWT.Secret, err = resolveSecret(src, "JWT_SECRET"); err != nil {
		errs = append(errs, err)
	}
	if cfg.JWT.AccessTTL, err = resolveDuration(src, "JWT_ACCESS_TTL", 15*time.Minute); err != nil {
		errs = append(errs, err)
	}
	if cfg.JWT.RefreshTTL, err = resolveDuration(src, "JWT_REFRESH_TTL", 168*time.Hour); err != nil {
		errs = append(errs, err)
	}

	// Logging
	cfg.Logging.Level = resolveStringDefault(src, "LOG_LEVEL", defaultLogLevel(env))
	cfg.Logging.Format = resolveStringDefault(src, "LOG_FORMAT", defaultLogFormat(env))
	cfg.Logging.VerboseModules = resolveCSV(src, "LOG_VERBOSE_MODULES")

	// Features
	if cfg.Features.MaintenanceMode, err = resolveBool(src, "FEATURE_MAINTENANCE_MODE", false); err != nil {
		errs = append(errs, err)
	}
	if cfg.Features.RegistrationEnabled, err = resolveBool(src, "FEATURE_REGISTRATION_ENABLED", true); err != nil {
		errs = append(errs, err)
	}
	if cfg.Features.DepositEnabled, err = resolveBool(src, "FEATURE_DEPOSIT_ENABLED", true); err != nil {
		errs = append(errs, err)
	}
	if cfg.Features.WithdrawalEnabled, err = resolveBool(src, "FEATURE_WITHDRAWAL_ENABLED", true); err != nil {
		errs = append(errs, err)
	}

	// Security
	if cfg.Security.IdempotencyTTL, err = resolveDuration(src, "SECURITY_IDEMPOTENCY_TTL", 24*time.Hour); err != nil {
		errs = append(errs, err)
	}

	if len(errs) > 0 {
		return Config{}, errs
	}
	return cfg, nil
}

// MustLoad loads configuration and panics on error. Intended for tests and tooling only.
func MustLoad(src Source) Config {
	cfg, err := LoadFrom(src)
	if err != nil {
		panic(fmt.Sprintf("config: %v", err))
	}
	return cfg
}
