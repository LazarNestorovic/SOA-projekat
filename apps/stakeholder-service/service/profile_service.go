package service

import (
	"context"
	"fmt"
	"stakeholder_service/model"
)

type ProfileService struct {
	repo model.ProfileRepository
}

func NewProfileService(repo model.ProfileRepository) model.ProfileService {
	return &ProfileService{repo: repo}
}

func (s *ProfileService) GetProfile(ctx context.Context, id uint) error {
	err := s.repo.GetProfile(ctx, id)
	if err != nil {
		fmt.Errorf("Get Profile: %w", err)
	}
	return nil
}
