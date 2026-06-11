// Package handler exposes instrument HTTP delivery adapters.
package handler

import (
	"net/http"

	"github.com/imohammadali/arz-baran/backend/internal/module/instrument/service"
	"github.com/labstack/echo/v4"
)

// Handler registers instrument HTTP routes.
type Handler struct {
	svc *service.Service
}

// New constructs the instrument HTTP handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// Register attaches instrument routes to the module route group.
func (h *Handler) Register(g *echo.Group) {
	g.GET("/status", h.status)
}

func (h *Handler) status(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"module": "instrument",
		"status": "skeleton",
	})
}
