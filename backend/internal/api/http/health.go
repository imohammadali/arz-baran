package http

import (
	"context"
	"net/http"
	"time"

	"backend/internal/ports"

	"github.com/labstack/echo/v5"
)

const healthCheckTimeout = 3 * time.Second

type HealthHandler struct {
	appName string
	db      ports.Pinger
	cache   ports.Pinger
}

func NewHealthHandler(appName string, db, cache ports.Pinger) *HealthHandler {
	return &HealthHandler{
		appName: appName,
		db:      db,
		cache:   cache,
	}
}

type healthResponse struct {
	Status  string            `json:"status"`
	Service string            `json:"service"`
	Checks  map[string]string `json:"checks,omitempty"`
}

func (h *HealthHandler) Live(c *echo.Context) error {
	return c.JSON(http.StatusOK, healthResponse{
		Status:  "ok",
		Service: h.appName,
	})
}

func (h *HealthHandler) Ready(c *echo.Context) error {
	ctx, cancel := context.WithTimeout(c.Request().Context(), healthCheckTimeout)
	defer cancel()

	checks := map[string]string{
		"postgres": "ok",
		"redis":    "ok",
	}

	if err := h.db.Ping(ctx); err != nil {
		checks["postgres"] = "down"
		return c.JSON(http.StatusServiceUnavailable, healthResponse{
			Status:  "unavailable",
			Service: h.appName,
			Checks:  checks,
		})
	}

	if err := h.cache.Ping(ctx); err != nil {
		checks["redis"] = "down"
		return c.JSON(http.StatusServiceUnavailable, healthResponse{
			Status:  "unavailable",
			Service: h.appName,
			Checks:  checks,
		})
	}

	return c.JSON(http.StatusOK, healthResponse{
		Status:  "ok",
		Service: h.appName,
		Checks:  checks,
	})
}
