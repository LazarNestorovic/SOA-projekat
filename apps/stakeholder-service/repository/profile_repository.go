package repository

import (
	"context"
	"database/sql"
	"fmt"
	"stakeholder_service/model"
)

type ProfileRepository struct {
	db *sql.DB
}

func NewProfileRepository(db *sql.DB) model.ProfileRepository {
	return &ProfileRepository{db: db}
}

func (repo *ProfileRepository) CreateProfile(ctx context.Context, userID uint) (*model.ProfileDto, error) {
	query := `INSERT INTO profiles (user_id, name, surname, image_url, biography, moto)
			  VALUES ($1, '', '', '', '', '')
			  RETURNING id, name, surname, image_url, biography, moto`

	profileDto := &model.ProfileDto{}

	err := repo.db.QueryRowContext(ctx, query, userID).Scan(
		&profileDto.Id,
		&profileDto.Name,
		&profileDto.Surname,
		&profileDto.ImageURL,
		&profileDto.Biography,
		&profileDto.Moto,
	)
	if err != nil {
		return nil, fmt.Errorf("greška pri kreiranju profila: %w", err)
	}

	return profileDto, nil
}

func (repo *ProfileRepository) GetProfile(ctx context.Context, id uint) (*model.ProfileDto, error) {
	query := `SELECT id, name, surname, image_url, biography, moto
			  FROM profiles
			  WHERE id = $1`

	profileDto := &model.ProfileDto{}

	err := repo.db.QueryRowContext(ctx, query, id).Scan(
		&profileDto.Id,
		&profileDto.Name,
		&profileDto.Surname,
		&profileDto.ImageURL,
		&profileDto.Biography,
		&profileDto.Moto,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("korisnik ne postoji")
	}
	if err != nil {
		return nil, fmt.Errorf("greška pri pretraživanju profila: %w", err)
	}

	return profileDto, nil
}

func (repo *ProfileRepository) GetProfileByUserId(ctx context.Context, userID uint) (*model.ProfileDto, error) {
	query := `SELECT id, name, surname, image_url, biography, moto
			  FROM profiles
			  WHERE user_id = $1`

	profileDto := &model.ProfileDto{}

	err := repo.db.QueryRowContext(ctx, query, userID).Scan(
		&profileDto.Id,
		&profileDto.Name,
		&profileDto.Surname,
		&profileDto.ImageURL,
		&profileDto.Biography,
		&profileDto.Moto,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("profil ne postoji")
	}
	if err != nil {
		return nil, fmt.Errorf("greška pri pretraživanju profila: %w", err)
	}

	return profileDto, nil
}

func (repo *ProfileRepository) UpdateProfile(ctx context.Context, id uint, profile model.UpdateProfileRequest) (*model.ProfileDto, error) {
	query := `UPDATE profiles
			  SET name = $1,
				  surname = $2,
				  image_url = $3,
				  biography = $4,
				  moto = $5
			  WHERE id = $6
			  RETURNING id, name, surname, image_url, biography, moto`

	updated := &model.ProfileDto{}
	err := repo.db.QueryRowContext(
		ctx,
		query,
		profile.Name,
		profile.Surname,
		profile.ImageURL,
		profile.Biography,
		profile.Moto,
		id,
	).Scan(
		&updated.Id,
		&updated.Name,
		&updated.Surname,
		&updated.ImageURL,
		&updated.Biography,
		&updated.Moto,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("korisnik ne postoji")
	}
	if err != nil {
		return nil, fmt.Errorf("greška pri izmeni profila: %w", err)
	}

	return updated, nil
}

func (repo *ProfileRepository) UpdateProfileByUserId(ctx context.Context, userID uint, profile model.UpdateProfileRequest) (*model.ProfileDto, error) {
	query := `UPDATE profiles
			  SET name = $1,
				  surname = $2,
				  image_url = $3,
				  biography = $4,
				  moto = $5
			  WHERE user_id = $6
			  RETURNING id, name, surname, image_url, biography, moto`

	updated := &model.ProfileDto{}
	err := repo.db.QueryRowContext(
		ctx,
		query,
		profile.Name,
		profile.Surname,
		profile.ImageURL,
		profile.Biography,
		profile.Moto,
		userID,
	).Scan(
		&updated.Id,
		&updated.Name,
		&updated.Surname,
		&updated.ImageURL,
		&updated.Biography,
		&updated.Moto,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("profil ne postoji")
	}
	if err != nil {
		return nil, fmt.Errorf("greška pri izmeni profila: %w", err)
	}

	return updated, nil
}
