// Package service implements IAM application use cases.
package service

import (
	"context"

	"github.com/imohammadali/arz-baran/backend/internal/kernel"
	iamapi "github.com/imohammadali/arz-baran/backend/internal/module/iam/api"
	"github.com/imohammadali/arz-baran/backend/internal/module/iam/store"
)

// Service implements iam.API.
type Service struct {
	repo store.Repository
}

// New constructs the IAM application service.
func New(repo store.Repository) *Service {
	return &Service{repo: repo}
}

// UserExists implements iam.API.
func (s *Service) UserExists(ctx context.Context, userID kernel.ID) (bool, error) {
	if s.repo == nil {
		return false, nil
	}
	return s.repo.Exists(ctx, userID)
}

var _ iamapi.API = (*Service)(nil)
