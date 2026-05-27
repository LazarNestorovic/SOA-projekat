package client

import (
	"api-gateway/pb"
	"context"
	"fmt"
	"os"
	"sync"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// ValidateTokenResponse — rezultat validacije tokena.
type ValidateTokenResponse struct {
	UserID   uint
	Username string
	Email    string
	Role     string
}

// AuthClient — gRPC klijent prema auth-service.
type AuthClient struct {
	client pb.AuthServiceClient
}

var (
	globalAuthClient *AuthClient
	clientOnce       sync.Once
)

// NewAuthClient vraća singleton gRPC klijent.
// Konekcija se uspostavlja jednom (lazy) i deli se između svih zahteva.
func NewAuthClient() *AuthClient {
	clientOnce.Do(func() {
		addr := os.Getenv("AUTH_SERVICE_GRPC_URL")
		if addr == "" {
			addr = "auth-service:9091"
		}

		conn, err := grpc.NewClient(
			addr,
			grpc.WithTransportCredentials(insecure.NewCredentials()),
		)
		if err != nil {
			panic(fmt.Sprintf("auth-service gRPC konekcija neuspešna (%s): %v", addr, err))
		}

		globalAuthClient = &AuthClient{
			client: pb.NewAuthServiceClient(conn),
		}
	})
	return globalAuthClient
}

// ValidateToken — šalje gRPC zahtev i vraća podatke o korisniku.
func (c *AuthClient) ValidateToken(ctx context.Context, token string) (*ValidateTokenResponse, error) {
	resp, err := c.client.ValidateToken(ctx, &pb.ValidateTokenRequest{Token: token})
	if err != nil {
		return nil, fmt.Errorf("auth gRPC ValidateToken: %w", err)
	}

	return &ValidateTokenResponse{
		UserID:   uint(resp.UserId),
		Username: resp.Username,
		Email:    resp.Email,
		Role:     resp.Role,
	}, nil
}
