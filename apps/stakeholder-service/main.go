package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"stakeholder_service/config"
	"stakeholder_service/handler"
	"stakeholder_service/middleware"
	"stakeholder_service/pb"
	"stakeholder_service/repository"
	"stakeholder_service/service"

	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/gorilla/mux"
	"google.golang.org/grpc"
)

func main() {
	// ─── Baza podataka ────────────────────────────────────────────────────
	dbconfig := config.NewDBConfig()
	db, err := config.ConnectDB(dbconfig)
	if err != nil {
		log.Fatalf("Error with database connection: %v", err)
	}
	defer db.Close()

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatal(err)
	}

	if err := repository.RunMigrations(driver); err != nil {
		log.Fatalf("❌ Migracije neuspješne: %v", err)
	}
	log.Println("✅ Migracije uspješno pokrenute!")

	// ─── Slojevi aplikacije ───────────────────────────────────────────────
	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)
	userHandler := handler.NewUserHandler(userService)

	profileRepository := repository.NewProfileRepository(db)
	profileService := service.NewProfileService(profileRepository)
	profileHandler := handler.NewProfileHandler(profileService)

	accountRepo := repository.NewAccountRepository(db)
	accountService := service.NewAccountService(accountRepo)
	accountHandler := handler.NewAccountHandler(accountService)

	userService.SetProfileRepository(profileRepository)

	// ─── HTTP server (postojeće rute) ─────────────────────────────────────
	router := mux.NewRouter()

	auth := router.PathPrefix("/api/stakeholders/auth").Subrouter()
	auth.HandleFunc("/register", userHandler.Register).Methods(http.MethodPost)
	auth.HandleFunc("/login", userHandler.Login).Methods(http.MethodPost)

	protected := router.PathPrefix("/api/stakeholders").Subrouter()
	protected.Use(middleware.JWTMiddleware)
	protected.HandleFunc("/me", userHandler.Me).Methods(http.MethodGet)
	protected.HandleFunc("/users/{id}", userHandler.GetUser).Methods(http.MethodGet)
	protected.HandleFunc("/users", userHandler.GetUsers).Methods(http.MethodGet)
	protected.HandleFunc("/users/{id}/block", userHandler.BlockAccount).Methods(http.MethodPut)
	protected.HandleFunc("/users/{id}/topup", userHandler.TopUpBalance).Methods(http.MethodPost)
	protected.HandleFunc("/profile", profileHandler.GetProfile).Methods(http.MethodGet)
	protected.HandleFunc("/profile/update", profileHandler.UpdateProfile).Methods(http.MethodPut)
	protected.HandleFunc("/balance/debit", accountHandler.DebitBalance).Methods(http.MethodPost)
	protected.HandleFunc("/balance/credit", accountHandler.CreditBalance).Methods(http.MethodPost)

	// Interni HTTP endpoint (zadržan za kompatibilnost)
	router.HandleFunc("/internal/balance/deduct", userHandler.DeductBalanceInternal).Methods(http.MethodPost)
	router.HandleFunc("/internal/users/{id}", userHandler.DeleteUserInternal).Methods(http.MethodDelete)

	// ─── gRPC server (port 9092) ──────────────────────────────────────────
	grpcPort := os.Getenv("GRPC_PORT")
	if grpcPort == "" {
		grpcPort = "9092"
	}

	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatalf("gRPC listener greška: %v", err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterStakeholderServiceServer(grpcServer, &stakeholderGRPCServer{
		userService: userService,
	})

	go func() {
		fmt.Printf("Stakeholder service gRPC pokrenut na portu :%s\n", grpcPort)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("gRPC server greška: %v", err)
		}
	}()

	// ─── HTTP server (blokira) ────────────────────────────────────────────
	httpPort := os.Getenv("SERVER_PORT")
	if httpPort == "" {
		httpPort = "8082"
	}
	fmt.Printf("Stakeholder service HTTP pokrenut na portu :%s\n", httpPort)
	log.Fatal(http.ListenAndServe(":"+httpPort, router))
}
