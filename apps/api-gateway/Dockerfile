FROM golang:1.26.1-alpine AS builder

# Instaliraj protoc i Go plugin-ove
RUN apk add --no-cache protobuf
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.36.5
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1

WORKDIR /src

COPY ./api-gateway ./api-gateway
COPY ./proto      ./proto

# Preuzmi zavisnosti
RUN go mod tidy -C ./api-gateway

# Generiši pb kod za auth (isti proto kao auth-service, lokalni paket pb/)
WORKDIR /src/api-gateway
RUN mkdir -p pb && \
    protoc \
      --go_out=pb       --go_opt=paths=source_relative \
      --go-grpc_out=pb  --go-grpc_opt=paths=source_relative \
      --proto_path=../proto/auth \
      ../proto/auth/auth.proto

# Build (sve .go fajlove u paketu)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/api-gateway .

FROM alpine:3.21
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/api-gateway /app/api-gateway
RUN chmod +x /app/api-gateway
EXPOSE 8080
ENTRYPOINT ["/app/api-gateway"]
