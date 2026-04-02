package main

import (
	"auth-service/config"
	"auth-service/handler"
	"auth-service/middleware"
	"auth-service/repository"
	"auth-service/service"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	// Inicijalizuj bazu podataka
	dbConfig := config.NewDBConfig()
	db, err := config.ConnectDB(dbConfig)
	if err != nil {
		log.Fatalf("Greška pri konekciji na bazu: %v", err)
	}
	defer db.Close()

	// Kreira repository, service i handler
	userRepo := repository.NewUserRepository(db)
	authService := service.NewAuthService(userRepo)
	authHandler := handler.NewAuthHandler(authService)

	// Router
	r := mux.NewRouter()

	// Javne rute (bez JWT)
	auth := r.PathPrefix("/auth").Subrouter()
	auth.HandleFunc("/register", authHandler.Register).Methods(http.MethodPost)
	auth.HandleFunc("/login", authHandler.Login).Methods(http.MethodPost)

	// Zaštićene rute (sa JWT middleware-om)
	protected := r.PathPrefix("/api").Subrouter()
	protected.Use(middleware.JWTMiddleware)
	protected.HandleFunc("/me", authHandler.Me).Methods(http.MethodGet)
	protected.HandleFunc("/users/{id}", authHandler.GetUser).Methods(http.MethodGet)

	port := ":8081"
	fmt.Printf("Auth service pokrenut na portu %s\n", port)
	log.Fatal(http.ListenAndServe(port, r))
}
