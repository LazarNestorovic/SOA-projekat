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

type StakeholderClient struct {
	client pb.StakeholderServiceClient
}

var (
	globalStakeholderClient *StakeholderClient
	stakeholderClientOnce   sync.Once
)

func NewStakeholderClient() *StakeholderClient {
	stakeholderClientOnce.Do(func() {
		addr := os.Getenv("STAKEHOLDER_SERVICE_GRPC_URL")
		if addr == "" {
			addr = "stakeholder-service:9092"
		}

		conn, err := grpc.NewClient(
			addr,
			grpc.WithTransportCredentials(insecure.NewCredentials()),
		)
		if err != nil {
			panic(fmt.Sprintf("stakeholder-service gRPC konekcija neuspesna (%s): %v", addr, err))
		}

		globalStakeholderClient = &StakeholderClient{client: pb.NewStakeholderServiceClient(conn)}
	})
	return globalStakeholderClient
}

func (c *StakeholderClient) GetUser(ctx context.Context, userID uint, requesterRole string) (*pb.User, error) {
	resp, err := c.client.GetUser(ctx, &pb.GetUserRequest{
		UserId:        uint32(userID),
		RequesterRole: requesterRole,
	})
	if err != nil {
		return nil, fmt.Errorf("stakeholder gRPC GetUser: %w", err)
	}
	return resp.User, nil
}

func (c *StakeholderClient) GetUsers(ctx context.Context, requesterRole string) ([]*pb.User, error) {
	resp, err := c.client.GetUsers(ctx, &pb.GetUsersRequest{RequesterRole: requesterRole})
	if err != nil {
		return nil, fmt.Errorf("stakeholder gRPC GetUsers: %w", err)
	}
	return resp.Users, nil
}
