package main

import (
	"auth-service/utils"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
)

type issueTokenRequest struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

type issueTokenResponse struct {
	Token string `json:"token"`
}

type validateTokenRequest struct {
	Token string `json:"token"`
}

type validateTokenResponse struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

func main() {
	// Router
	r := mux.NewRouter()

	// Health check endpoint
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "healthy",
			"service": "auth-service",
		})
	}).Methods(http.MethodGet)

	r.HandleFunc("/token/issue", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		var req issueTokenRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Nevažeći zahtev"})
			return
		}

		if req.UserID == 0 || req.Username == "" || req.Email == "" || req.Role == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Nedostaju obavezna polja"})
			return
		}

		token, err := utils.GenerateToken(&utils.User{
			ID:       req.UserID,
			Username: req.Username,
			Email:    req.Email,
			Role:     utils.Role(req.Role),
		})
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Greška pri generisanju tokena"})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(issueTokenResponse{Token: token})
	}).Methods(http.MethodPost)

	r.HandleFunc("/token/validate", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		var req validateTokenRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Nevažeći zahtev"})
			return
		}

		if req.Token == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Token je obavezan"})
			return
		}

		claims, err := utils.VerifyToken(req.Token)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Nevažeći token"})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(validateTokenResponse{
			UserID:   claims.UserID,
			Username: claims.Username,
			Email:    claims.Email,
			Role:     string(claims.Role),
		})
	}).Methods(http.MethodPost)

	serverPort := os.Getenv("SERVER_PORT")
	if serverPort == "" {
		serverPort = "8081"
	}
	port := ":" + serverPort
	fmt.Printf("Auth service (JWT endast) pokrenut na portu %s\n", port)
	log.Fatal(http.ListenAndServe(port, r))
}
