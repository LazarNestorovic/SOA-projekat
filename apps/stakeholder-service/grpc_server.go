package main

import (
	"context"
	"stakeholder_service/model"
	"stakeholder_service/pb"
	"stakeholder_service/service"
	"time"

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

// GetUser — vraća korisnika po ID-u (samo admin).
func (s *stakeholderGRPCServer) GetUser(
	ctx context.Context,
	req *pb.GetUserRequest,
) (*pb.UserResponse, error) {
	if req.RequesterRole != "admin" {
		return nil, status.Error(codes.PermissionDenied, "Samo admin može videti podatke drugih korisnika")
	}

	user, err := s.userService.GetUserByID(uint(req.UserId))
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "korisnik nije pronađen: %v", err)
	}

	return &pb.UserResponse{User: mapUserToPB(user)}, nil
}

// GetUsers — vraća listu svih korisnika (samo admin).
func (s *stakeholderGRPCServer) GetUsers(
	ctx context.Context,
	req *pb.GetUsersRequest,
) (*pb.UserListResponse, error) {
	if req.RequesterRole != "admin" {
		return nil, status.Error(codes.PermissionDenied, "Samo admin može videti sve korisnike")
	}

	users, err := s.userService.GetAllUsers()
	if err != nil {
		return nil, status.Errorf(codes.Internal, "greška pri dohvatanju korisnika: %v", err)
	}

	respUsers := make([]*pb.User, 0, len(users))
	for _, user := range users {
		respUsers = append(respUsers, mapUserToPB(user))
	}

	return &pb.UserListResponse{Users: respUsers}, nil
}

func mapUserToPB(user *model.User) *pb.User {
	createdAt := ""
	if !user.CreatedAt.IsZero() {
		createdAt = user.CreatedAt.UTC().Format(time.RFC3339)
	}

	return &pb.User{
		Id:        uint32(user.ID),
		Username:  user.Username,
		Email:     user.Email,
		Role:      string(user.Role),
		Blocked:   user.Blocked,
		Balance:   user.Balance,
		CreatedAt: createdAt,
	}
}
