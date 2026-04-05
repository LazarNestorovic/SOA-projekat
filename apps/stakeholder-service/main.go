package main

import (
	"net/http"
	"stakeholder-service/config"

	"github.com/gorilla/mux"
)

func main() {

	dbconfig := config.NewDBConfig()

	router := mux.NewRouter()
	http.ListenAndServe(":8082", nil)
}
