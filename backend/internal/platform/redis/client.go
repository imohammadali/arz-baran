// Package redis provides the shared Redis client.
package redis

import (
	"context"
	"fmt"

	"github.com/imohammadali/arz-baran/backend/internal/platform/config"
	goredis "github.com/redis/go-redis/v9"
)

// Client wraps a go-redis client.
type Client struct {
	*goredis.Client
}

// NewClient creates and verifies a Redis connection.
func NewClient(ctx context.Context, cfg config.Redis) (*Client, error) {
	client := goredis.NewClient(&goredis.Options{
		Addr:     cfg.Addr,
		Password: cfg.Password,
	})

	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("redis: ping: %w", err)
	}

	return &Client{Client: client}, nil
}

// Pinger supports health checks.
type Pinger interface {
	Ping(ctx context.Context) error
}

// Ping implements Pinger.
func (c *Client) Ping(ctx context.Context) error {
	return c.Client.Ping(ctx).Err()
}
