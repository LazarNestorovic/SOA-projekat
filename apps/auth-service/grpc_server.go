package main

import (
	"auth-service/pb"
	"auth-service/utils"
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// authGRPCServer implementira pb.AuthServiceServer interfejs.
type authGRPCServer struct {
	pb.UnimplementedAuthServiceServer
}

// ValidateToken — proverava JWT token i vraća claims.
func (s *authGRPCServer) ValidateToken(
	ctx context.Context,
	req *pb.ValidateTokenRequest,
) (*pb.ValidateTokenResponse, error) {
	claims, err := utils.VerifyToken(req.Token)
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "nevažeći token: %v", err)
	}

	return &pb.ValidateTokenResponse{
		UserId:   uint32(claims.UserID),
		Username: claims.Username,
		Email:    claims.Email,
		Role:     string(claims.Role),
	}, nil
}
