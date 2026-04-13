package config

import (
	"database/sql"
	"fmt"
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
		password = "root"
	}

	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "stakeholders"
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
	postgreSQLInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode)

	db, err := sql.Open("postgres", postgreSQLInfo)

	if err != nil {
		return nil, fmt.Errorf("Error with database opening: %w", err)
	}

	err = db.Ping()
	if err != nil {
		return nil, fmt.Errorf("Error with database connecting: %w", err)
	}

	fmt.Println("Successful connected to database")
	return db, nil
}
