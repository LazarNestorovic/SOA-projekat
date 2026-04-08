package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	// Router
	r := mux.NewRouter()

	// Health check endpoint
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "healthy",
			"service": "auth-service",
		})
	}).Methods(http.MethodGet)

	port := ":8081"
	fmt.Printf("Auth service (JWT endast) pokrenut na portu %s\n", port)
	log.Fatal(http.ListenAndServe(port, r))
}
