package main

import (
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
}
}
