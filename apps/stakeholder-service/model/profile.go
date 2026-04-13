package model

import "context"

type ProfileRepository interface {
	GetProfile(ctx context.Context, id uint) (*ProfileDto, error)
	UpdateProfile(ctx context.Context, id uint, profile UpdateProfileRequest) (*ProfileDto, error)
}

type ProfileService interface {
	GetProfile(ctx context.Context, id uint) (*ProfileDto, error)
	UpdateProfile(ctx context.Context, id uint, profile UpdateProfileRequest) (*ProfileDto, error)
}

type Profile struct {
	Id        uint   `json:"id"`
	Name      string `json:"name"`
	Surname   string `json:"surname"`
	ImageURL  string `json:"image_url"`
	Biography string `json:"biography"`
	Moto      string `json:"moto"`
}

type ProfileDto struct {
	Id        uint   `json:"id"`
	Name      string `json:"name"`
	Surname   string `json:"surname"`
	ImageURL  string `json:"image_url"`
	Biography string `json:"biography"`
	Moto      string `json:"moto"`
}

type UpdateProfileRequest struct {
	Name      string `json:"name"`
	Surname   string `json:"surname"`
	ImageURL  string `json:"image_url"`
	Biography string `json:"biography"`
	Moto      string `json:"moto"`
}
