package trading

import (
	"context"

	tradingapi "github.com/imohammadali/arz-baran/backend/internal/module/trading/api"
	"github.com/imohammadali/arz-baran/backend/internal/module/trading/handler"
	"github.com/imohammadali/arz-baran/backend/internal/module/trading/service"
	"github.com/imohammadali/arz-baran/backend/internal/platform/clock"
	"github.com/imohammadali/arz-baran/backend/internal/platform/logger"
	platformmodule "github.com/imohammadali/arz-baran/backend/internal/platform/module"
	"github.com/labstack/echo/v4"
)

// Module wires the trading bounded context.
type Module struct {
	api     tradingapi.API
	handler *handler.Handler
}

// Dependencies required to construct the trading module.
type Dependencies struct {
	Logger logger.ApplicationLogger
	// Repository store.Repository — wired when sqlc store is implemented.
}

// New constructs the trading module.
// TODO(Phase 3): pass deps.Logger down to service when store is wired.
func New(deps Dependencies) *Module {
	_ = deps.Logger
	svc := service.New(nil, clock.SystemClock{})
	return &Module{
		api:     svc,
		handler: handler.New(svc),
	}
}

// API exposes the cross-module facade.
func (m *Module) API() tradingapi.API {
	return m.api
}

// Name implements platformmodule.Module.
func (m *Module) Name() string { return "trading" }

// RegisterHTTP implements platformmodule.Module.
func (m *Module) RegisterHTTP(g *echo.Group) {
	m.handler.Register(g)
}

// RegisterWorkers implements platformmodule.Module.
func (m *Module) RegisterWorkers(_ platformmodule.WorkerRegistry) {}

// Close implements platformmodule.Module.
func (m *Module) Close(_ context.Context) error { return nil }

var _ platformmodule.Module = (*Module)(nil)
