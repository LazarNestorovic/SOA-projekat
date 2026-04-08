package model

import "time"

type Role string

const (
	Admin   Role = "admin"
	Vodic   Role = "vodic"
	Turista Role = "turista"
)

type User struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	Password  string    `json:"-"`
	Role      Role      `json:"role"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}
