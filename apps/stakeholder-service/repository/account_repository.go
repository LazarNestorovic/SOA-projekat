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

func (r *AccountRepository) DebitBalance(ctx context.Context, userID uint, amount float64) error {
	query := `
		UPDATE users
		SET balance = balance - $1
		WHERE id = $2 AND balance >= $1
	`
	result, err := r.db.ExecContext(ctx, query, amount, userID)
	if err != nil {
		return fmt.Errorf("failed to debit balance: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("insufficient funds or user not found")
	}

	return nil
}

func (r *AccountRepository) CreditBalance(ctx context.Context, userID uint, amount float64) error {
	query := `
		UPDATE users
		SET balance = balance + $1
		WHERE id = $2
	`
	_, err := r.db.ExecContext(ctx, query, amount, userID)
	if err != nil {
		return fmt.Errorf("failed to credit balance: %w", err)
	}
	return nil
}
