// Package service implements trading application use cases.
package service

import (
	"context"

	"github.com/shopspring/decimal"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	tradingapi "github.com/imohammadali/arz-baran/backend/internal/module/trading/api"
	"github.com/imohammadali/arz-baran/backend/internal/module/trading/domain"
	"github.com/imohammadali/arz-baran/backend/internal/module/trading/store"
	"github.com/imohammadali/arz-baran/backend/internal/platform/clock"
)

// Service implements trading.API.
type Service struct {
	repo  store.Repository
	clock clock.Clock
}

// New constructs the trading application service.
func New(repo store.Repository, clk clock.Clock) *Service {
	return &Service{repo: repo, clock: clk}
}

// PlaceOrder validates the command and creates a new Order.
func (s *Service) PlaceOrder(ctx context.Context, cmd tradingapi.PlaceOrderCommand) (kernel.ID, error) {
	qty, err := decimal.NewFromString(cmd.Quantity)
	if err != nil || !qty.IsPositive() {
		return kernel.ID{}, domain.ErrInvalidOrderQty("invalid quantity: " + cmd.Quantity)
	}

	now := s.clock.Now()
	id := kernel.NewID()

	var order *domain.Order

	switch cmd.Type {
	case "market":
		order, err = domain.NewMarketOrder(id, cmd.UserID, cmd.Pair, domain.Side(cmd.Side), qty, cmd.IdempotencyKey, now)
	default: // limit
		price, pErr := decimal.NewFromString(cmd.Price)
		if pErr != nil || !price.IsPositive() {
			return kernel.ID{}, domain.ErrInvalidOrderPrice("invalid price: " + cmd.Price)
		}
		order, err = domain.NewLimitOrder(id, cmd.UserID, cmd.Pair, domain.Side(cmd.Side), price, qty, cmd.IdempotencyKey, now)
	}
	if err != nil {
		return kernel.ID{}, err
	}

	if s.repo != nil {
		if saveErr := s.repo.SaveOrder(ctx, order); saveErr != nil {
			return kernel.ID{}, saveErr
		}
	}

	return order.ID, nil
}

// CancelOrder cancels an open Order belonging to userID.
func (s *Service) CancelOrder(ctx context.Context, orderID kernel.ID, userID kernel.ID) error {
	if s.repo == nil {
		return nil
	}
	order, err := s.repo.FindOrder(ctx, orderID)
	if err != nil {
		return err
	}
	return order.Cancel(s.clock.Now())
}

var _ tradingapi.API = (*Service)(nil)
