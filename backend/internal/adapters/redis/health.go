package redis

import (
	"context"

	platformredis "backend/internal/platform/redis"
)

type HealthChecker struct {
	client *platformredis.Client
}

func NewHealthChecker(client *platformredis.Client) *HealthChecker {
	return &HealthChecker{client: client}
}

func (h *HealthChecker) Ping(ctx context.Context) error {
	return h.client.Ping(ctx)
}
