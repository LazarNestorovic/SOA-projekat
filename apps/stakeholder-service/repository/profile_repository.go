package repository

import (
	"context"
	"database/sql"
	"fmt"
	"stakeholder_service/model"
	"time"
)

type ProfileRepository struct {
	db *sql.DB
}

func NewProfileRepository(db *sql.DB) model.ProfileRepository {
	return &ProfileRepository{db: db}
}

func (repo *ProfileRepository) GetProfile(ctx context.Context, id uint) error {
	query := `SELECT name, surname, image_url, biography, moto
			  FROM profiles
			  WHERE id = $1`

	_, err := repo.db.ExecContext(ctx, query, time.Now(), id)
	if err != nil {
		return fmt.Errorf("Get profile: %w", err)
	}

	return nil
}
