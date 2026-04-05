package config

import (
	"database/sql"
	"os"
)

type DBConfig struct {
	Host string
	Port string
	User string
	Password string	
	DBName string
	SSLMode string	
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
		dbname = "stakeholders"
	}

	sslmode := os.Getenv("DB_SSLMODE")
	if sslmode == "" {
		sslmode = "disable"
	}

	return &DBConfig {
		Host : host
		Port : port
		User : user
		Password : password
		DBName : dbname
		SSLMode : sslmode
	}
}