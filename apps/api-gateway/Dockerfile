FROM golang:1.26.1-alpine AS builder

WORKDIR /src

COPY ./api-gateway ./api-gateway

# Install dependencies  
RUN go mod tidy -C ./api-gateway
RUN go mod download -C ./api-gateway

# Build api_gateway
WORKDIR /src/api-gateway
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/api-gateway ./api_gateway.go

FROM alpine:3.21

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /out/api-gateway /app/api-gateway
RUN chmod +x /app/api-gateway

EXPOSE 8080

ENTRYPOINT ["/app/api-gateway"]