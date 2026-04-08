package service

import (
	"stakeholder-service/model"
	"stakeholder-service/repository"
)

type UserService struct {
	userRepo *repository.UserRepository
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
	}
}

// GetAllUsers - dobij sve korisnike
func (s *UserService) GetAllUsers() ([]*model.User, error) {
	users, err := s.userRepo.GetAll()
	if err != nil {
		return nil, err
	}

	// Očisti sve lozinke
	for _, user := range users {
		user.Password = ""
	}

	return users, nil
}
