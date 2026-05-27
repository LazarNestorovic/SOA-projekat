FROM golang:1.26.1-alpine AS builder

# Instaliraj protoc i Go plugin-ove za generisanje koda
RUN apk add --no-cache protobuf
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.36.5
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1

WORKDIR /src/auth-service

# Kopiraj go.mod i preuzmi zavisnosti
COPY auth-service/go.mod ./
RUN go mod tidy

# Kopiraj izvorni kod i proto fajlove
COPY auth-service/ ./
COPY proto/ ./proto/

# Generiši gRPC/protobuf kod iz proto/auth/auth.proto → pb/
RUN mkdir -p pb && \
    protoc \
      --go_out=pb       --go_opt=paths=source_relative \
      --go-grpc_out=pb  --go-grpc_opt=paths=source_relative \
      --proto_path=proto/auth \
      proto/auth/auth.proto

# Build (kompajlira sve .go fajlove u paketu, uključujući grpc_server.go)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/auth-service .

FROM alpine:3.21
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/auth-service /app/auth-service
EXPOSE 8081 9091
ENTRYPOINT ["/app/auth-service"]
