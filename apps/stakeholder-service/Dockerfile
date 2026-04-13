FROM golang:1.26.1-alpine AS builder

WORKDIR /src

# Copy all apps first (so auth-service is available for replace directive)
COPY . .

# Install dependencies  
RUN go mod tidy -C ./stakeholder-service
RUN go mod download -C ./stakeholder-service

# Build stakeholder-service
WORKDIR /src/stakeholder-service
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/stakeholder-service ./main.go

FROM alpine:3.21

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /out/stakeholder-service /app/stakeholder-service
COPY stakeholder-service/migrations /app/migrations

EXPOSE 8082

ENTRYPOINT ["/app/stakeholder-service"]
