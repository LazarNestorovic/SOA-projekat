package model

import "context"

type AccountRepository interface {
	BlockAccount(ctx context.Context, id uint) error
	DebitBalance(ctx context.Context, userID uint, amount float64) error
	CreditBalance(ctx context.Context, userID uint, amount float64) error
}

type AccountService interface {
	BlockAccount(ctx context.Context, id uint) error
	DebitBalance(ctx context.Context, userID uint, amount float64) error
	CreditBalance(ctx context.Context, userID uint, amount float64) error
}

const (
	RoleGuide   Role = "guide"
	RoleTourist Role = "tourist"
	RoleAdmin   Role = "admin"
)

type Account struct {
	Id       uint   `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"-"`
	Role     Role   `json:"role"`
	Blocked  bool   `json:"blocked"`
}
