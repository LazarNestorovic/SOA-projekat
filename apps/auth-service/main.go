package main

import (
	"auth-service/pb"
	"auth-service/utils"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"google.golang.org/grpc"
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
	// ─── HTTP server (postojeće rute) ─────────────────────────────────────
	r := mux.NewRouter()

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

	httpPort := os.Getenv("SERVER_PORT")
	if httpPort == "" {
		httpPort = "8081"
	}

	// ─── gRPC server (port 9091) ──────────────────────────────────────────
	grpcPort := os.Getenv("GRPC_PORT")
	if grpcPort == "" {
		grpcPort = "9091"
	}

	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatalf("gRPC listener greška: %v", err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterAuthServiceServer(grpcServer, &authGRPCServer{})

	go func() {
		fmt.Printf("Auth service gRPC pokrenut na portu :%s\n", grpcPort)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("gRPC server greška: %v", err)
		}
	}()

	// ─── HTTP server (blokira) ────────────────────────────────────────────
	fmt.Printf("Auth service HTTP pokrenut na portu :%s\n", httpPort)
	log.Fatal(http.ListenAndServe(":"+httpPort, r))
}
