package service

import (
	"context"
	"fmt"
	"stakeholder_service/client"
	"stakeholder_service/model"
	"stakeholder_service/repository"
	"stakeholder_service/utils"
)

type UserService struct {
	userRepo    *repository.UserRepository
	profileRepo model.ProfileRepository
	authClient  *client.AuthClient
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{
		userRepo:   userRepo,
		authClient: client.NewAuthClientFromEnv(),
	}
}

func (s *UserService) SetProfileRepository(profileRepo model.ProfileRepository) {
	s.profileRepo = profileRepo
}

// Register - registruj novog korisnika
func (s *UserService) Register(req *model.RegistrationRequest) (*model.User, error) {
	// Validacija ulaza
	if req.Username == "" || req.Password == "" || req.Email == "" {
		return nil, fmt.Errorf("korisničko ime, lozinka i mejl su obavezni")
	}

	// Provera da li je uloga dozvoljens za registraciju
	if !isAllowedRole(req.Role) {
		return nil, fmt.Errorf("uloga nije dozvoljena za registraciju")
	}

	// Provera da li korisnik već postoji
	exists, err := s.userRepo.IsEmailExists(req.Email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("korisnik sa tim mejlom već postoji")
	}

	// Provera da li korisničko ime postoji
	exists, err = s.userRepo.IsUsernameExists(req.Username)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("korisničko ime je već zauzeto")
	}

	// Heširaj lozinku
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("greška pri heširanju lozinke: %w", err)
	}

	// Kreiraj novog korisnika
	user := &model.User{
		Username: req.Username,
		Email:    req.Email,
		Password: hashedPassword,
		Role:     req.Role,
	}

	// Sačuvaj u bazi
	err = s.userRepo.Create(user)
	if err != nil {
		return nil, err
	}

	// Kreiraj profil za novog korisnika ako je profileRepo dostupan
	if s.profileRepo != nil {
		_, err = s.profileRepo.CreateProfile(context.Background(), user.ID)
		if err != nil {
			// Log error ali nastavi da vraćaš korisnika (profil nije kritičan)
			fmt.Printf("Upozorenje: Profil nije kreiran za korisnika %d: %v\n", user.ID, err)
		}
	}

	// Očisti lozinku u odgovoru
	user.Password = ""
	return user, nil
}

// Login - prijavi korisnika
func (s *UserService) Login(email, password string) (*model.AuthResponse, error) {
	if email == "" || password == "" {
		return nil, fmt.Errorf("mejl i lozinka su obavezni")
	}

	// Pronađi korisnika po mejlu
	user, err := s.userRepo.GetByEmail(email)
	if err != nil {
		return nil, fmt.Errorf("korisnik ne postoji")
	}

	// Verifikuj lozinku
	if !utils.VerifyPassword(user.Password, password) {
		return nil, fmt.Errorf("lozinka je pogrešna")
	}

	// Generiši JWT token pozivom auth-service HTTP API-ja
	token, err := s.authClient.IssueToken(context.Background(), client.IssueTokenRequest{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
		Role:     string(user.Role),
	})
	if err != nil {
		return nil, fmt.Errorf("greška pri generisanju tokena: %w", err)
	}

	// Očisti lozinku u odgovoru
	user.Password = ""

	return &model.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

// GetUserByID - dobij korisnika po ID-u
func (s *UserService) GetUserByID(id uint) (*model.User, error) {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	// Očisti lozinku
	user.Password = ""
	return user, nil
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

// isAllowedRole provera da li je uloga dozvoljens za registraciju
func isAllowedRole(role model.Role) bool {
	switch role {
	case model.Admin, model.Vodic, model.Turista:
		return true
	default:
		return false
	}
}

func (s *UserService) BlockAccount(ctx context.Context, id uint) error {
	//Proveriti da li account postoji
	//Zatim proveriti da li je account vec blokiran

	err := s.userRepo.BlockAccount(ctx, id)
	if err != nil {
		return fmt.Errorf("Block Account: %w", err)
	}

	return nil
}
