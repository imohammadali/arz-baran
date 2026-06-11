// Package handler exposes IAM HTTP delivery adapters.
package handler

import (
	"net/http"

	"github.com/imohammadali/arz-baran/backend/internal/module/iam/service"
	"github.com/labstack/echo/v4"
)

// Handler registers IAM HTTP routes.
type Handler struct {
	svc *service.Service
}

// New constructs the IAM HTTP handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// Register attaches IAM routes to the module route group.
func (h *Handler) Register(g *echo.Group) {
	g.GET("/status", h.status)
}

func (h *Handler) status(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"module": "iam",
		"status": "skeleton",
	})
}
