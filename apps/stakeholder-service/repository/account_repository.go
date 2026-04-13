package repository

import (
	"context"
	"database/sql"
	"fmt"
	"stakeholder_service/model"
	"time"
)

type AccountRepository struct {
	db *sql.DB
}

func NewAccountRepository(db *sql.DB) model.AccountRepository {
	return &AccountRepository{db: db}
}

func (r *AccountRepository) BlockAccount(ctx context.Context, id uint) error {
	query := `
		UPDATE accounts
		SET
			blocked = TRUE,
			updated_at = $1
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, time.Now(), id)
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
