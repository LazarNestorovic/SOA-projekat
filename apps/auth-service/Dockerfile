# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /src

# Instaliraj dependencies
RUN apk add --no-cache git

# Cache dependencies
COPY apps/auth-service/go.mod apps/auth-service/go.sum ./
RUN go mod download

# Kopiraj kod
COPY apps/auth-service/ .

# Kompajliraj sa optimizacijama
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/auth-service .

# Final stage
FROM alpine:3.21

WORKDIR /app

# Instaliraj dependencies
RUN apk add --no-cache ca-certificates tzdata

# Kopiraj binarnu datoteku iz builder stage-a
COPY --from=builder /out/auth-service /app/auth-service

# Izloži port
EXPOSE 8081

# Pokreni
ENTRYPOINT ["/app/auth-service"]
