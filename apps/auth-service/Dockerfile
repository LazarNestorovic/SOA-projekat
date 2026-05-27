FROM golang:1.26.1-alpine AS builder

# Instaliraj protoc i Go plugin-ove
RUN apk add --no-cache protobuf
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.36.5
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1

WORKDIR /src/auth-service

# Kopiraj izvorni kod i proto fajlove
COPY auth-service/ ./
COPY proto/ ./proto/

# 1. Generiši pb/ fajlove (oni importuju grpc/protobuf)
RUN mkdir -p pb && \
    protoc \
      --go_out=pb       --go_opt=paths=source_relative \
      --go-grpc_out=pb  --go-grpc_opt=paths=source_relative \
      --proto_path=proto/auth \
      proto/auth/auth.proto

# 2. go mod tidy POSLE generisanja — sada vidi grpc/protobuf importe i popunjava go.sum
RUN go mod tidy

# 3. Build
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/auth-service .

FROM alpine:3.21
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/auth-service /app/auth-service
EXPOSE 8081 9091
ENTRYPOINT ["/app/auth-service"]
