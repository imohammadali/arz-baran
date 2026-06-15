// Package handler exposes wallet HTTP delivery adapters.
package handler

import (
	"net/http"

	"github.com/imohammadali/arz-baran/backend/internal/module/wallet/service"
	"github.com/labstack/echo/v4"
)

// Handler registers wallet HTTP routes.
type Handler struct {
	svc *service.Service
}

// New constructs the wallet HTTP handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// Register attaches wallet routes to the module route group.
func (h *Handler) Register(g *echo.Group) {
	g.GET("/status", h.status)
}

// status returns the wallet module surface status.
//
//	@Summary		Wallet module status
//	@Description	Returns the current operational status of the Wallet (ledger, accounts, holds) module.
//	@Tags			wallet
//	@Produce		json
//	@Success		200	{object}	map[string]string
//	@Router			/v1/wallet/status [get]
func (h *Handler) status(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"module": "wallet",
		"status": "skeleton",
	})
}
