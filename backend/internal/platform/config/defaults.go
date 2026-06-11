package config

import "time"

func defaultLogLevel(env Environment) string {
	if env == EnvDevelopment || env == EnvTest {
		return "debug"
	}
	return "info"
}

func defaultLogFormat(env Environment) string {
	if env == EnvDevelopment || env == EnvTest {
		return "text"
	}
	return "json"
}

func defaultPostgresSSLMode(env Environment) string {
	if env == EnvStaging || env == EnvProduction {
		return "require"
	}
	return "disable"
}

func defaultRunMigrations(env Environment) bool {
	return env == EnvDevelopment || env == EnvTest
}

func defaultJWTAlgorithm(env Environment) string {
	if env == EnvDevelopment || env == EnvTest {
		return "HS256"
	}
	return "RS256"
}

func defaultServerTimeouts() (read, write, idle time.Duration) {
	return 15 * time.Second, 15 * time.Second, 60 * time.Second
}
