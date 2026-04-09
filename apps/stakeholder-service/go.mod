module stakeholder_service

go 1.26.1

require (
	auth-service v0.0.0-00010101000000-000000000000
	github.com/gorilla/mux v1.8.1
	github.com/lib/pq v1.10.9
	golang.org/x/crypto v0.49.0
)

require github.com/golang-migrate/migrate/v4 v4.19.1

replace auth-service => ../auth-service
