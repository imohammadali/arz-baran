package config

import "fmt"

// SafeSummary returns a redacted configuration summary safe for startup logs.
func (c Config) SafeSummary() string {
	return fmt.Sprintf(
		"env=%s service=%s version=%s server=%s:%d postgres=%s@%s:%d/%s sslmode=%s redis=%s tls=%t jwt_alg=%s features={maintenance:%t registration:%t deposit:%t withdrawal:%t} log={level:%s format:%s}",
		c.Meta.Env,
		c.Meta.ServiceName,
		c.Meta.Version,
		c.Server.Host,
		c.Server.Port,
		c.Postgres.User,
		c.Postgres.Host,
		c.Postgres.Port,
		c.Postgres.Database,
		c.Postgres.SSLMode,
		c.Redis.Addr,
		c.Redis.TLSEnabled,
		c.JWT.Algorithm,
		c.Features.MaintenanceMode,
		c.Features.RegistrationEnabled,
		c.Features.DepositEnabled,
		c.Features.WithdrawalEnabled,
		c.Logging.Level,
		c.Logging.Format,
	)
}
