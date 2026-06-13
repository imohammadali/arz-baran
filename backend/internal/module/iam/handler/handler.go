// Package handler exposes IAM HTTP delivery adapters.
package handler

import (
	"net/http"

	iamapi "github.com/imohammadali/arz-baran/backend/internal/module/iam/api"
	"github.com/labstack/echo/v4"
)

// Handler registers IAM HTTP routes.
type Handler struct {
	svc iamapi.API
}

// New constructs the IAM HTTP handler.
func New(svc iamapi.API) *Handler {
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
