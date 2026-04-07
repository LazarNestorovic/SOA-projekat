package repository

import (
	"auth-service/model"
	"database/sql"
	"fmt"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// GetAll vraća sve korisnike iz baze
func (r *UserRepository) GetAll() ([]*model.User, error) {
	query := `
		SELECT id, username, email, password, role, created_at
		FROM users
		ORDER BY id
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("greška pri učitavanju korisnika: %w", err)
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		user := &model.User{}
		err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Email,
			&user.Password,
			&user.Role,
			&user.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("greška pri čitanju korisnika: %w", err)
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("greška pri iteraciji kroz korisnike: %w", err)
	}

	return users, nil
}
