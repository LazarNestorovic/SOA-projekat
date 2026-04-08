package model

import "context"

type AccountRepository interface {
	BlockAccount(ctx context.Context, id uint) error
}

type AccountService interface {
	BlockAccount(ctx context.Context, id uint) error
}

type Role string

const (
	RoleGuide   Role = "guide"
	RoleTourist Role = "tourist"
	RoleAdmin   Role = "admin"
)

type Account struct {
	Id       uint   `json: "id"`
	Username string `json: "username"`
	Email    string `json: "email"`
	Password string `json: "-"`
	Role     Role   `json: "role"`
	Blocked  bool   `json: "blocked"`
}
