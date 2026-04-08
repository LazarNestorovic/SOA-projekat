# Koristi Go build image
FROM golang:1.26.1-alpine AS builder

WORKDIR /app

# Instaliraj dependencies
RUN apk add --no-cache git

# Kopiraj sve app direktorijume (trebam auth-service kao dependency)
COPY apps/ ./apps

WORKDIR /app/apps/stakeholder-service

# Preuzmi module
RUN go mod download

# Kompajliraj
RUN go build -o stakeholder-service .

# Multi-stage build - finalna slika
FROM alpine:latest

WORKDIR /root/

# Instaliraj ca-certificates za HTTPS
RUN apk --no-cache add ca-certificates

# Kopiraj binarnu datoteku iz builder stage-a
COPY --from=builder /app/apps/stakeholder-service/stakeholder-service .

EXPOSE 8082

CMD ["./stakeholder-service"]
