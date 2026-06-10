package redis

import (
	"context"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

const defaultPingTimeout = 5 * time.Second

type Client struct {
	*goredis.Client
}

func Connect(ctx context.Context, redisURL string) (*Client, error) {
	opts, err := goredis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}

	client := goredis.NewClient(opts)

	pingCtx, cancel := context.WithTimeout(ctx, defaultPingTimeout)
	defer cancel()

	if err := client.Ping(pingCtx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return &Client{Client: client}, nil
}

func (c *Client) Ping(ctx context.Context) error {
	return c.Client.Ping(ctx).Err()
}

func (c *Client) Close() error {
	return c.Client.Close()
}
