package repository

import (
	"log"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigrations(driver database.Driver) error {
	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations", // Putanja do tvojih .sql fajlova
		"postgres",          // Ime baze
		driver,
	)
	if err != nil {
		log.Fatal(err)
	}

	// 4. Pokreni migracije (Up)
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatal(err)
	}

	return nil
}
