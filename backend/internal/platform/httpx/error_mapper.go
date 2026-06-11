package httpx

import (
	"errors"
	"net/http"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	"github.com/imohammadali/arz-baran/backend/internal/platform/logger"
	"github.com/labstack/echo/v4"
)

// ErrorMapper translates internal errors to HTTP responses.
type ErrorMapper interface {
	Map(err error) (status int, body ErrorResponse)
	HTTPErrorHandler(err error, c echo.Context)
}

// Registry maps stable error codes to HTTP status codes.
type Registry map[kernel.Code]int

// DefaultRegistry is the initial code → status mapping scaffold.
var DefaultRegistry = Registry{
	kernel.CodeInternalError:          http.StatusInternalServerError,
	kernel.CodeServiceUnavailable:     http.StatusServiceUnavailable,
	kernel.CodeValidationInvalidInput: http.StatusUnprocessableEntity,
}

// Mapper implements ErrorMapper using a code registry.
type Mapper struct {
	registry Registry
}

// NewErrorMapper constructs an ErrorMapper with the given registry.
func NewErrorMapper(registry Registry) *Mapper {
	if registry == nil {
		registry = DefaultRegistry
	}
	return &Mapper{registry: registry}
}

// Map converts an internal error to an HTTP status and response body.
func (m *Mapper) Map(err error) (int, ErrorResponse) {
	requestID := ""
	correlationID := ""

	var kerr kernel.Error
	if errors.As(err, &kerr) {
		status, ok := m.registry[kerr.Code()]
		if !ok {
			status = http.StatusInternalServerError
		}
		return status, ErrorResponse{
			Error: APIError{
				Code:          kerr.Code(),
				Message:       kerr.Message(),
				RequestID:     requestID,
				CorrelationID: correlationID,
			},
		}
	}

	return http.StatusInternalServerError, ErrorResponse{
		Error: APIError{
			Code:      kernel.CodeInternalError,
			Message:   "An internal error occurred",
			RequestID: requestID,
		},
	}
}

// HTTPErrorHandler is the Echo HTTPErrorHandler hook.
func (m *Mapper) HTTPErrorHandler(err error, c echo.Context) {
	if c.Response().Committed {
		return
	}

	ctx := c.Request().Context()
	requestID, _ := logger.RequestIDFromContext(ctx)
	if requestID == "" {
		requestID = c.Response().Header().Get(logger.HeaderRequestID)
	}
	correlationID, _ := logger.CorrelationIDFromContext(ctx)
	if correlationID == "" {
		correlationID = c.Response().Header().Get(logger.HeaderCorrelationID)
	}

	status, body := m.Map(err)
	body.Error.RequestID = requestID
	body.Error.CorrelationID = correlationID

	_ = c.JSON(status, body)
}
