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

type TourClient struct {
	client pb.TourServiceClient
}

var (
	globalTourClient *TourClient
	tourClientOnce   sync.Once
)

func NewTourClient() *TourClient {
	tourClientOnce.Do(func() {
		addr := os.Getenv("TOUR_SERVICE_GRPC_URL")
		if addr == "" {
			addr = "tour-service:9095"
		}

		conn, err := grpc.NewClient(
			addr,
			grpc.WithTransportCredentials(insecure.NewCredentials()),
		)
		if err != nil {
			panic(fmt.Sprintf("tour-service gRPC konekcija neuspešna (%s): %v", addr, err))
		}

		globalTourClient = &TourClient{client: pb.NewTourServiceClient(conn)}
	})
	return globalTourClient
}

func (c *TourClient) CreateTour(ctx context.Context, req *pb.CreateTourRequest) (*pb.TourResponse, error) {
	resp, err := c.client.CreateTour(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("tour gRPC CreateTour: %w", err)
	}
	return resp, nil
}

func (c *TourClient) UpdateTourStatus(ctx context.Context, req *pb.UpdateTourStatusRequest) (*pb.TourResponse, error) {
	resp, err := c.client.UpdateTourStatus(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("tour gRPC UpdateTourStatus: %w", err)
	}
	return resp, nil
}
