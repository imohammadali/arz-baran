package wallet

import (
	"context"

	walletapi "github.com/imohammadali/arz-baran/backend/internal/module/wallet/api"
	"github.com/imohammadali/arz-baran/backend/internal/module/wallet/handler"
	"github.com/imohammadali/arz-baran/backend/internal/module/wallet/service"
	"github.com/imohammadali/arz-baran/backend/internal/platform/logger"
	platformmodule "github.com/imohammadali/arz-baran/backend/internal/platform/module"
	"github.com/labstack/echo/v4"
)

// Module wires the wallet bounded context.
type Module struct {
	api     walletapi.API
	handler *handler.Handler
}

// Dependencies required to construct the wallet module.
type Dependencies struct {
	Logger logger.ApplicationLogger
	// IAM iam.API — wired when wallet use cases require user validation.
}

// New constructs the wallet module.
func New(deps Dependencies) *Module {
	svc := service.New()
	return &Module{
		api:     svc,
		handler: handler.New(svc),
	}
}

// API exposes the cross-module facade.
func (m *Module) API() walletapi.API {
	return m.api
}

// Name implements platformmodule.Module.
func (m *Module) Name() string { return "wallet" }

// RegisterHTTP implements platformmodule.Module.
func (m *Module) RegisterHTTP(g *echo.Group) {
	m.handler.Register(g)
}

// RegisterWorkers implements platformmodule.Module.
func (m *Module) RegisterWorkers(_ platformmodule.WorkerRegistry) {}

// Close implements platformmodule.Module.
func (m *Module) Close(_ context.Context) error { return nil }

var _ platformmodule.Module = (*Module)(nil)
