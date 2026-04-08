package repository

import (
	"database/sql"
	"fmt"
	"stakeholder-service/model"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create kreira novog korisnika u bazi
func (r *UserRepository) Create(user *model.User) error {
	query := `
		INSERT INTO users (username, email, password, role)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(
		query,
		user.Username,
		user.Email,
		user.Password,
		user.Role,
	).Scan(&user.ID, &user.CreatedAt)

	if err != nil {
		return fmt.Errorf("greška pri kreiranju korisnika: %w", err)
	}

	return nil
}

// GetByEmail pronađi korisnika po mejlu
func (r *UserRepository) GetByEmail(email string) (*model.User, error) {
	query := `
		SELECT id, username, email, password, role, created_at
		FROM users
		WHERE email = $1
	`

	user := &model.User{}
	err := r.db.QueryRow(query, email).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Role,
		&user.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("korisnik ne postoji")
	}

	if err != nil {
		return nil, fmt.Errorf("greška pri pretraživanju korisnika: %w", err)
	}

	return user, nil
}

// GetByUsername pronađi korisnika po korisnčkom imenu
func (r *UserRepository) GetByUsername(username string) (*model.User, error) {
	query := `
		SELECT id, username, email, password, role, created_at
		FROM users
		WHERE username = $1
	`

	user := &model.User{}
	err := r.db.QueryRow(query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Role,
		&user.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("korisnik ne postoji")
	}

	if err != nil {
		return nil, fmt.Errorf("greška pri pretraživanju korisnika: %w", err)
	}

	return user, nil
}

// GetByID pronađi korisnika po ID-u
func (r *UserRepository) GetByID(id uint) (*model.User, error) {
	query := `
		SELECT id, username, email, password, role, created_at
		FROM users
		WHERE id = $1
	`

	user := &model.User{}
	err := r.db.QueryRow(query, id).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Role,
		&user.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("korisnik ne postoji")
	}

	if err != nil {
		return nil, fmt.Errorf("greška pri pretraživanju korisnika: %w", err)
	}

	return user, nil
}

// IsEmailExists proveriti da li mejl postoji
func (r *UserRepository) IsEmailExists(email string) (bool, error) {
	query := "SELECT COUNT(*) FROM users WHERE email = $1"
	var count int
	err := r.db.QueryRow(query, email).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("greška pri pretraživanju mejla: %w", err)
	}
	return count > 0, nil
}

// IsUsernameExists proveriti da li korisničko ime postoji
func (r *UserRepository) IsUsernameExists(username string) (bool, error) {
	query := "SELECT COUNT(*) FROM users WHERE username = $1"
	var count int
	err := r.db.QueryRow(query, username).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("greška pri pretraživanju korisničkog imena: %w", err)
	}
	return count > 0, nil
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
