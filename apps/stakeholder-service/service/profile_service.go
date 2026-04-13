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

func (s *ProfileService) GetProfile(ctx context.Context, id uint) (*model.ProfileDto, error) {
	profile, err := s.repo.GetProfile(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("Get Profile: %w", err)
	}
	return profile, nil
}

func (s *ProfileService) UpdateProfile(ctx context.Context, id uint, profile model.UpdateProfileRequest) (*model.ProfileDto, error) {
	updated, err := s.repo.UpdateProfile(ctx, id, profile)
	if err != nil {
		return nil, fmt.Errorf("Update Profile: %w", err)
	}

	return updated, nil
}
