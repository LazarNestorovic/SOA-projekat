FROM golang:1.26.1-alpine AS builder

WORKDIR /src/auth-service

COPY auth-service/go.mod auth-service/go.sum ./
RUN go mod download

COPY auth-service/ ./

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/auth-service ./main.go

FROM alpine:3.21

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /out/auth-service /app/auth-service

EXPOSE 8081

ENTRYPOINT ["/app/auth-service"]
