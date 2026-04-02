package handler

import (
	"auth-service/model"
	"auth-service/service"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register - API endpoint za registraciju
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req model.RegistrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Nevažeći zahtev",
		})
		return
	}

	// Registruj korisnika
	user, err := h.authService.Register(&req)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Korisnik uspešno registrovan",
		"user":    user,
	})
}

// Login - API endpoint za prijavu
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Nevažeći zahtev",
		})
		return
	}

	// Prijavi korisnika
	response, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// Me - API endpoint za dobijanje podataka trenutnog korisnika
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Pronađi ID iz konteksta (postavljeno od strane JWT middleware)
	userID, ok := r.Context().Value("userID").(uint)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Neautentifikovan korisnik",
		})
		return
	}

	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

// GetUser - API endpoint za dobijanje podataka korisnika po ID-u
func (h *AuthHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Ekstraktuj ID iz URL-a
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Nevažeći ID",
		})
		return
	}

	user, err := h.authService.GetUserByID(uint(id))
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

// ExtractToken - ekstraktuj token iz zahteva
func (h *AuthHandler) ExtractToken(r *http.Request) string {
	bearerToken := r.Header.Get("Authorization")
	if len(bearerToken) > 7 && strings.HasPrefix(bearerToken, "Bearer ") {
		return bearerToken[7:]
	}
	return ""
}
