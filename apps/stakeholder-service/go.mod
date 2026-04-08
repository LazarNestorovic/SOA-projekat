module stakeholder-service

go 1.26.1

require (
	github.com/golang-jwt/jwt/v5 v5.2.0
	github.com/gorilla/mux v1.8.1
	github.com/lib/pq v1.10.9
	golang.org/x/crypto v0.49.0
)

replace auth-service => ../auth-service
