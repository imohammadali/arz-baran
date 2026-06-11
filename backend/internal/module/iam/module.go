package iam

import (
	"context"

	iamapi "github.com/imohammadali/arz-baran/backend/internal/module/iam/api"
	"github.com/imohammadali/arz-baran/backend/internal/module/iam/handler"
	"github.com/imohammadali/arz-baran/backend/internal/module/iam/service"
	"github.com/imohammadali/arz-baran/backend/internal/platform/logger"
	platformmodule "github.com/imohammadali/arz-baran/backend/internal/platform/module"
	"github.com/labstack/echo/v4"
)

// Module wires the IAM bounded context.
type Module struct {
	api     iamapi.API
	handler *handler.Handler
}

// Dependencies required to construct the IAM module.
type Dependencies struct {
	Logger logger.ApplicationLogger
	// Repository store.Repository — wired when sqlc store is implemented.
}

// New constructs the IAM module.
func New(deps Dependencies) *Module {
	svc := service.New(nil)
	return &Module{
		api:     svc,
		handler: handler.New(svc),
	}
}

// API exposes the cross-module facade.
func (m *Module) API() iamapi.API {
	return m.api
}

// Name implements platformmodule.Module.
func (m *Module) Name() string { return "iam" }

// RegisterHTTP implements platformmodule.Module.
func (m *Module) RegisterHTTP(g *echo.Group) {
	m.handler.Register(g)
}

// RegisterWorkers implements platformmodule.Module.
func (m *Module) RegisterWorkers(_ platformmodule.WorkerRegistry) {}

// Close implements platformmodule.Module.
func (m *Module) Close(_ context.Context) error { return nil }

var _ platformmodule.Module = (*Module)(nil)
