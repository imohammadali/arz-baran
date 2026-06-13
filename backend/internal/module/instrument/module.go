package instrument

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	instrumentapi "github.com/imohammadali/arz-baran/backend/internal/module/instrument/api"
	"github.com/imohammadali/arz-baran/backend/internal/module/instrument/handler"
	"github.com/imohammadali/arz-baran/backend/internal/module/instrument/service"
	"github.com/imohammadali/arz-baran/backend/internal/module/instrument/store"
	"github.com/imohammadali/arz-baran/backend/internal/platform/logger"
	platformmodule "github.com/imohammadali/arz-baran/backend/internal/platform/module"
	"github.com/labstack/echo/v4"
)

// Module wires the instrument bounded context.
type Module struct {
	api     instrumentapi.API
	handler *handler.Handler
}

// Dependencies required to construct the instrument module.
type Dependencies struct {
	Logger logger.ApplicationLogger
	Pool   *pgxpool.Pool
}

// New constructs the instrument module.
func New(deps Dependencies) *Module {
	_ = deps.Logger
	repo := store.NewPostgresRepository(deps.Pool)
	svc := service.New(repo)
	return &Module{
		api:     svc,
		handler: handler.New(svc),
	}
}

// API exposes the cross-module facade.
func (m *Module) API() instrumentapi.API {
	return m.api
}

// Name implements platformmodule.Module.
func (m *Module) Name() string { return "instrument" }

// RegisterHTTP implements platformmodule.Module.
func (m *Module) RegisterHTTP(g *echo.Group) {
	m.handler.Register(g)
}

// RegisterWorkers implements platformmodule.Module.
func (m *Module) RegisterWorkers(_ platformmodule.WorkerRegistry) {}

// Close implements platformmodule.Module.
func (m *Module) Close(_ context.Context) error { return nil }

var _ platformmodule.Module = (*Module)(nil)
