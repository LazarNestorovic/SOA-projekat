FROM golang:1.26.1-alpine AS builder

WORKDIR /src

# Cache dependencies first.
COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/stakeholder-service ./main.go

FROM alpine:3.21

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /out/stakeholder-service /app/stakeholder-service
COPY migrations /app/migrations

EXPOSE 8082

ENTRYPOINT ["/app/stakeholder-service"]
