package repository

import (
	"context"
	"database/sql"
	"fmt"
	"stakeholder_service/model"
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
		SELECT id, username, email, password, role, created_at, balance
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
		&user.Balance,
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
		SELECT id, username, email, password, role, created_at, balance
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
		&user.Balance,
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
		SELECT id, username, email, password, role, created_at, balance
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
		&user.Balance,
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
		SELECT id, username, email, password, role, created_at, blocked, balance
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
			&user.Blocked,
			&user.Balance,
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

func (r *UserRepository) DeleteByID(ctx context.Context, id uint) error {
	query := `DELETE FROM users WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("greška pri brisanju korisnika: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("greška pri proveri brisanja: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("korisnik ne postoji")
	}
	return nil
}

func (r *UserRepository) TopUpBalance(ctx context.Context, id uint, amount float64) (float64, error) {
	var newBalance float64
	err := r.db.QueryRowContext(ctx,
		`UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance`,
		amount, id,
	).Scan(&newBalance)
	if err == sql.ErrNoRows {
		return 0, fmt.Errorf("korisnik nije pronađen")
	}
	return newBalance, err
}

func (r *UserRepository) DeductBalance(ctx context.Context, id uint, amount float64) (float64, error) {
	var newBalance float64
	err := r.db.QueryRowContext(ctx,
		`UPDATE users SET balance = balance - $1
		 WHERE id = $2 AND balance >= $1
		 RETURNING balance`,
		amount, id,
	).Scan(&newBalance)
	if err == sql.ErrNoRows {
		return 0, fmt.Errorf("insufficient_balance")
	}
	return newBalance, err
}

func (r *UserRepository) BlockAccount(ctx context.Context, id uint) error {
	query := `
		UPDATE users
		SET
			blocked = TRUE
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("Block account: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("Rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("account not found")
	}

	return nil
}
