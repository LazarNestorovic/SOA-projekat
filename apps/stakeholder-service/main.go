package main

import (
<<<<<<< HEAD
	"fmt"
	"log"
	"net/http"
	"stakeholder-service/config"
	"stakeholder-service/handler"
	"stakeholder-service/middleware"
	"stakeholder-service/repository"
	"stakeholder-service/service"

=======
	"log"
	"net/http"
	"stakeholder_service/config"
	"stakeholder_service/handler"
	"stakeholder_service/repository"
	"stakeholder_service/service"

	"github.com/golang-migrate/migrate/v4/database/postgres"
>>>>>>> 16ed8b7534e890ec55de49aa9652d163b1f2601e
	"github.com/gorilla/mux"
)

func main() {
<<<<<<< HEAD
	// Inicijalizuj bazu podataka
	dbConfig := config.NewDBConfig()
	db, err := config.ConnectDB(dbConfig)
	if err != nil {
		log.Fatalf("Greška pri konekciji na bazu: %v", err)
	}
	defer db.Close()

	// Kreira repository, service i handler
	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)
	userHandler := handler.NewUserHandler(userService)

	// Router
	r := mux.NewRouter()

	// Zaštićene rute (sa JWT middleware-om)
	protected := r.PathPrefix("/api").Subrouter()
	protected.Use(middleware.JWTMiddleware)
	protected.HandleFunc("/users", userHandler.GetUsers).Methods(http.MethodGet)

	port := ":8082"
	fmt.Printf("Stakeholder service pokrenut na portu %s\n", port)
	log.Fatal(http.ListenAndServe(port, r))
=======

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

	accountRepository := repository.NewAccountRepository(db)
	accountService := service.NewAccountService(accountRepository)
	accountHandler := handler.NewAccountHandler(accountService)

	profileRepository := repository.NewProfileRepository(db)
	profileService := service.NewProfileService(profileRepository)
	profileHandler := handler.NewProfileHandler(profileService)

	router := mux.NewRouter()

	account := router.PathPrefix("/account").Subrouter()
	account.HandleFunc("/{id}/block", accountHandler.BlockAccount).Methods(http.MethodPut)

	profile := router.PathPrefix("/profile").Subrouter()
	profile.HandleFunc("/{id}", profileHandler.GetProfile).Methods(http.MethodGet)

	http.ListenAndServe(":8082", router)
>>>>>>> 16ed8b7534e890ec55de49aa9652d163b1f2601e
}
