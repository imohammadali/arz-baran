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

func (h *Handler) status(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"surface": "admin",
		"status":  "skeleton",
	})
}
