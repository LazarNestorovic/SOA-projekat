# Koristi Go build image
FROM golang:1.26.1-alpine

WORKDIR /app

# Instaliraj dependencies
RUN apk add --no-cache git

# Kopiraj go.mod i go.sum
COPY apps/stakeholder-service/go.mod apps/stakeholder-service/go.sum ./

# Preuzmi module
RUN go mod download

# Kopiraj kod
COPY apps/stakeholder-service/ .

# Kompajliraj
RUN go build -o stakeholder-service .

# Multi-stage build - finalna slika
FROM alpine:latest

WORKDIR /root/

# Instaliraj ca-certificates za HTTPS
RUN apk --no-cache add ca-certificates

# Kopiraj binarnu datoteku iz builder stage-a
COPY --from=0 /app/stakeholder-service .

# Izloži port
EXPOSE 8082

# Pokreni
CMD ["./stakeholder-service"]
