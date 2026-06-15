// Package handler exposes admin HTTP routes (delivery-only; no admin domain).
package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// Handler registers admin routes.
type Handler struct{}

// New constructs the admin HTTP handler.
func New() *Handler {
	return &Handler{}
}

// Register attaches admin routes to the route group.
func (h *Handler) Register(g *echo.Group) {
	g.GET("/status", h.status)
}

// status returns the admin surface status.
//
//	@Summary		Admin surface status
//	@Description	Returns the current operational status of the admin management surface.
//	@Tags			admin
//	@Produce		json
//	@Success		200	{object}	map[string]string
//	@Router			/v1/admin/status [get]
func (h *Handler) status(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"surface": "admin",
		"status":  "skeleton",
	})
}
