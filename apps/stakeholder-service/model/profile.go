package model

import "context"

type ProfileRepository interface {
	GetProfile(ctx context.Context, id uint) error
}

type ProfileService interface {
	GetProfile(ctx context.Context, id uint) error
}

type Profile struct {
	Id        uint   `json: "id"`
	Name      string `json: "name"`
	Surname   string `json: "surname"`
	ImageURL  string `json: "image_url"`
	Biography string `json: "biography"`
	Moto      string `json: "moto"`
}
