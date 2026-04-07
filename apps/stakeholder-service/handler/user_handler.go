package handler

import (
	"encoding/json"
	"net/http"
	"stakeholder-service/service"
)

type UserHandler struct {
	userService *service.UserService
}

func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// GetUsers - API endpoint za dobijanje svih korisnika (samo za admina)
func (h *UserHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Proverite da li je korisnik autentifikovan
	_, ok := r.Context().Value("userID")
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Neautentifikovan korisnik",
		})
		return
	}

	// Proverite da li je korisnik admin
	userRole, ok := r.Context().Value("role")
	if !ok {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Nije moguće proveriti ulogu korisnika",
		})
		return
	}

	// Konvertuj role u string
	roleStr, ok := userRole.(string)
	if !ok || roleStr != "admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Samo admin može videti sve korisnike",
		})
		return
	}

	users, err := h.userService.GetAllUsers()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"users": users,
	})
}
