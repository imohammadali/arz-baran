// Package handler exposes trading HTTP delivery adapters.
package handler

import (
	"net/http"

	tradingapi "github.com/imohammadali/arz-baran/backend/internal/module/trading/api"
	"github.com/labstack/echo/v4"
)

// Handler registers trading HTTP routes.
type Handler struct {
	svc tradingapi.API
}

// New constructs the trading HTTP handler.
func New(svc tradingapi.API) *Handler {
	return &Handler{svc: svc}
}

// Register attaches trading routes to the module route group.
func (h *Handler) Register(g *echo.Group) {
	g.GET("/status", h.status)
}

// status returns the trading module surface status.
//
//	@Summary		Trading module status
//	@Description	Returns the current operational status of the Trading (orders, trades) module.
//	@Tags			trading
//	@Produce		json
//	@Success		200	{object}	map[string]string
//	@Router			/v1/trading/status [get]
func (h *Handler) status(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"module": "trading",
		"status": "skeleton",
	})
}
