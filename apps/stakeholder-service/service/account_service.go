package service

import (
	"context"
	"fmt"
	"stakeholder_service/model"
)

type AccountService struct {
	repo model.AccountRepository
}

func NewAccountService(repo model.AccountRepository) model.AccountService {
	return &AccountService{repo: repo}
}

func (s *AccountService) BlockAccount(ctx context.Context, id uint) error {
	//Proveriti da li account postoji
	//Zatim proveriti da li je account vec blokiran

	err := s.repo.BlockAccount(ctx, id)
	if err != nil {
		return fmt.Errorf("Block Account: %w", err)
	}

	return nil
}
