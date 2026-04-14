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

func (s *ProfileService) CreateProfile(ctx context.Context, userID uint) (*model.ProfileDto, error) {
	created, err := s.repo.CreateProfile(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("Create Profile: %w", err)
	}

	return created, nil
}

func (s *ProfileService) GetProfileByUserId(ctx context.Context, userID uint) (*model.ProfileDto, error) {
	profile, err := s.repo.GetProfileByUserId(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("Get Profile By UserId: %w", err)
	}
	return profile, nil
}

func (s *ProfileService) UpdateProfileByUserId(ctx context.Context, userID uint, profile model.UpdateProfileRequest) (*model.ProfileDto, error) {
	updated, err := s.repo.UpdateProfileByUserId(ctx, userID, profile)
	if err != nil {
		return nil, fmt.Errorf("Update Profile By UserId: %w", err)
	}

	return updated, nil
}
