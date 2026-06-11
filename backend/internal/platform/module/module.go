// Package module defines the module contract for the modular monolith.
package module

import (
	"context"

	"github.com/labstack/echo/v4"
)

// Module is a bounded context registered with the composition root.
type Module interface {
	Name() string
	RegisterHTTP(g *echo.Group)
	RegisterWorkers(reg WorkerRegistry)
	Close(ctx context.Context) error
}

// WorkerRegistry registers background jobs for worker binaries.
type WorkerRegistry interface {
	Register(name string, fn WorkerFunc)
}

// WorkerFunc is a long-running or periodic background task.
type WorkerFunc func(ctx context.Context) error

// NoopWorkerRegistry ignores worker registration (used by the API binary).
type NoopWorkerRegistry struct{}

func (NoopWorkerRegistry) Register(_ string, _ WorkerFunc) {}
