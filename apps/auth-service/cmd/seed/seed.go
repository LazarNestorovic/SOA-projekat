package main

import (
	"auth-service/config"
	"auth-service/model"
	"auth-service/repository"
	"auth-service/utils"
	"fmt"
	"log"
)

func main() {
	// Inicijalizuj bazu podataka
	dbConfig := config.NewDBConfig()
	db, err := config.ConnectDB(dbConfig)
	if err != nil {
		log.Fatalf("Greška pri konekciji na bazu: %v", err)
	}
	defer db.Close()

	// Kreiraj repository
	userRepo := repository.NewUserRepository(db)

	// Kreiraj admin korisnike
	admins := []struct {
		username string
		email    string
		password string
	}{
		{
			username: "admin",
			email:    "admin@example.com",
			password: "admin123",
		},
		{
			username: "superadmin",
			email:    "superadmin@example.com",
			password: "superadmin123",
		},
	}

	for _, adminData := range admins {
		// Proverite da li admin već postoji
		exists, _ := userRepo.IsEmailExists(adminData.email)
		if exists {
			fmt.Printf("Admin sa mejlom %s već postoji\n", adminData.email)
			continue
		}

		// Heširaj lozinku
		hashedPassword, err := utils.HashPassword(adminData.password)
		if err != nil {
			log.Printf("Greška pri heširanju lozinke: %v\n", err)
			continue
		}

		// Kreiraj admin korisnika
		admin := &model.User{
			Username: adminData.username,
			Email:    adminData.email,
			Password: hashedPassword,
			Role:     model.Admin,
		}

		// Sačuvaj u bazi
		err = userRepo.Create(admin)
		if err != nil {
			log.Printf("Greška pri kreiranju admina %s: %v\n", adminData.username, err)
			continue
		}

		fmt.Printf("Admin %s uspešno kreiran\n", adminData.username)
	}

	fmt.Println("Seedovanje baze je završeno!")
}
