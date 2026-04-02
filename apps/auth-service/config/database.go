package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

func NewDBConfig() *DBConfig {
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "postgres"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "postgres"
	}
	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "auth_service"
	}
	sslmode := os.Getenv("DB_SSLMODE")
	if sslmode == "" {
		sslmode = "disable"
	}

	return &DBConfig{
		Host:     host,
		Port:     port,
		User:     user,
		Password: password,
		DBName:   dbname,
		SSLMode:  sslmode,
	}
}

func ConnectDB(config *DBConfig) (*sql.DB, error) {
	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode)

	log.Printf("Pokušavam spojiti na bazu sa: %s", psqlInfo)

	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		return nil, fmt.Errorf("greška pri otvaranju baze: %w", err)
	}

	err = db.Ping()
	if err != nil {
		return nil, fmt.Errorf("greška pri povezivanju na bazu: %w", err)
	}

	log.Println("Uspešno povezano na bazu!")
	return db, nil
}
