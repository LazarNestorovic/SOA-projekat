package main

import (
	"github.com/golang-migrate/migrate/v4/database/postgres"

	"log"
	"net/http"
	"stakeholder_service/config"
	"stakeholder_service/handler"
	"stakeholder_service/middleware"
	"stakeholder_service/repository"
	"stakeholder_service/service"

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

	//accountRepository := repository.NewAccountRepository(db)
	//accountService := service.NewAccountService(accountRepository)
	//accountHandler := handler.NewAccountHandler(accountService)

	profileRepository := repository.NewProfileRepository(db)
	profileService := service.NewProfileService(profileRepository)
	profileHandler := handler.NewProfileHandler(profileService)

	router := mux.NewRouter()

	// Javne rute (bez JWT)
	auth := router.PathPrefix("/auth").Subrouter()
	auth.HandleFunc("/register", userHandler.Register).Methods(http.MethodPost)
	auth.HandleFunc("/login", userHandler.Login).Methods(http.MethodPost)

	// Zaštićene rute (sa JWT middleware-om)
	protected := router.PathPrefix("/api").Subrouter()
	protected.Use(middleware.JWTMiddleware)
	protected.HandleFunc("/me", userHandler.Me).Methods(http.MethodGet)
	protected.HandleFunc("/users/{id}", userHandler.GetUser).Methods(http.MethodGet)
	protected.HandleFunc("/users", userHandler.GetUsers).Methods(http.MethodGet)
	protected.HandleFunc("/users/{id}/block", userHandler.BlockAccount).Methods(http.MethodPut)

	protected.HandleFunc("/profile/{id}", profileHandler.GetProfile).Methods(http.MethodGet)
	protected.HandleFunc("/profile/{id}/update", profileHandler.UpdateProfile).Methods(http.MethodPut)

	http.ListenAndServe(":8082", router)
}
