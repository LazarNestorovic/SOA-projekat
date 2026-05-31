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

func (s *AccountService) DebitBalance(ctx context.Context, userID uint, amount float64) error {
	if amount <= 0 {
		return fmt.Errorf("debit amount must be positive")
	}
	return s.repo.DebitBalance(ctx, userID, amount)
}

func (s *AccountService) CreditBalance(ctx context.Context, userID uint, amount float64) error {
	if amount <= 0 {
		return fmt.Errorf("credit amount must be positive")
	}
	return s.repo.CreditBalance(ctx, userID, amount)
}

