package main

import (
	"context"
	"stakeholder_service/pb"
	"stakeholder_service/service"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// stakeholderGRPCServer implementira pb.StakeholderServiceServer.
type stakeholderGRPCServer struct {
	pb.UnimplementedStakeholderServiceServer
	userService *service.UserService
}

// DeductBalance — skida iznos sa balansa turiste.
func (s *stakeholderGRPCServer) DeductBalance(
	ctx context.Context,
	req *pb.DeductBalanceRequest,
) (*pb.DeductBalanceResponse, error) {
	newBalance, err := s.userService.DeductBalance(ctx, uint(req.UserId), req.Amount)
	if err != nil {
		if err.Error() == "insufficient_balance" {
			return nil, status.Errorf(codes.FailedPrecondition, "nedovoljan balans")
		}
		return nil, status.Errorf(codes.Internal, "greška pri skidanju balansa: %v", err)
	}

	return &pb.DeductBalanceResponse{NewBalance: newBalance}, nil
}
