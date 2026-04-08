<<<<<<< HEAD
module stakeholder-service

go 1.21

require (
	github.com/golang-jwt/jwt/v5 v5.0.0
	github.com/gorilla/mux v1.8.0
	github.com/lib/pq v1.10.9
	auth-service v0.0.0
)

replace auth-service => ../auth-service
=======
module stakeholder_service

go 1.25.0

require (
	github.com/gorilla/mux v1.8.1
	github.com/lib/pq v1.12.3
)

require github.com/golang-migrate/migrate/v4 v4.19.1 // indirect
>>>>>>> 16ed8b7534e890ec55de49aa9652d163b1f2601e
