package model

import "time"

type Role string

const (
	Admin   Role = "admin"
	Vodic   Role = "guide"
	Turista Role = "tourist"
)

type User struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	Password  string    `json:"-"`
	Role      Role      `json:"role"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
	Blocked   bool      `json:"blocked"`
}

type RegistrationRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     Role   `json:"role"`
	Email    string `json:"email"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
