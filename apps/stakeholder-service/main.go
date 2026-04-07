package main

import (
	"log"
	"net/http"
	"stakeholder_service/config"
	"stakeholder_service/handler"
	"stakeholder_service/repository"
	"stakeholder_service/service"

	"github.com/golang-migrate/migrate/v4/database/postgres"
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
}
