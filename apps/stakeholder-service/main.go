package main

import (
	"github.com/golang-migrate/migrate/v4/database/postgres"

	"fmt"
	"log"
	"net/http"
	"stakeholder-service/config"
	"stakeholder-service/handler"
	"stakeholder-service/middleware"
	"stakeholder-service/repository"
	"stakeholder-service/service"

	"github.com/gorilla/mux"
)

func main() {

	dbconfig := config.NewDBConfig()
	db, err := config.ConnectDB(dbconfig)
	if err != nil {
		log.Fatalf("Error with database connection: %v", err)
	}
	defer db.Close()

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatal(err)
	}

	if err := repository.RunMigrations(driver); err != nil {
		log.Fatalf("❌ Migracije neuspješne: %v", err)
	}
	log.Println("✅ Migracije uspješno pokrenute!")

	// Kreira repository, service i handler
	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)
	userHandler := handler.NewUserHandler(userService)

	accountRepository := repository.NewAccountRepository(db)
	accountService := service.NewAccountService(accountRepository)
	accountHandler := handler.NewAccountHandler(accountService)

	profileRepository := repository.NewProfileRepository(db)
	profileService := service.NewProfileService(profileRepository)
	profileHandler := handler.NewProfileHandler(profileService)

	router := mux.NewRouter()

	// Javne rute (bez JWT)
	auth := r.PathPrefix("/auth").Subrouter()
	auth.HandleFunc("/register", userHandler.Register).Methods(http.MethodPost)
	auth.HandleFunc("/login", userHandler.Login).Methods(http.MethodPost)

	// Zaštićene rute (sa JWT middleware-om)
	protected := r.PathPrefix("/api").Subrouter()
	protected.Use(middleware.JWTMiddleware)
	protected.HandleFunc("/me", userHandler.Me).Methods(http.MethodGet)
	protected.HandleFunc("/users/{id}", userHandler.GetUser).Methods(http.MethodGet)
	protected.HandleFunc("/users", userHandler.GetUsers).Methods(http.MethodGet)

	account := router.PathPrefix("/account").Subrouter()
	account.HandleFunc("/{id}/block", accountHandler.BlockAccount).Methods(http.MethodPut)

	profile := router.PathPrefix("/profile").Subrouter()
	profile.HandleFunc("/{id}", profileHandler.GetProfile).Methods(http.MethodGet)

	http.ListenAndServe(":8082", router)
}
