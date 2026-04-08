# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /src

# Instaliraj dependencies
RUN apk add --no-cache git

# Cache dependencies
COPY apps/stakeholder-service/go.mod apps/stakeholder-service/go.sum ./
RUN go mod download

# Kopiraj kod
COPY apps/stakeholder-service/ .

# Kompajliraj sa optimizacijama
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/stakeholder-service .

# Final stage
FROM alpine:3.21

WORKDIR /app

# Instaliraj dependencies
RUN apk add --no-cache ca-certificates tzdata

# Kopiraj binarnu datoteku iz builder stage-a
COPY --from=builder /out/stakeholder-service /app/stakeholder-service

# Izloži port
EXPOSE 8082

# Pokreni
ENTRYPOINT ["/app/stakeholder-service"]
