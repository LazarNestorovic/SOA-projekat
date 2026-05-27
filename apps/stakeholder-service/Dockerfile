FROM golang:1.26.1-alpine AS builder

# Instaliraj protoc i Go plugin-ove
RUN apk add --no-cache protobuf
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.36.5
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1

WORKDIR /src

# Kopiraj sve (potrebno za replace direktive između servisa)
COPY . .

# Preuzmi zavisnosti
RUN go mod tidy -C ./stakeholder-service

# Generiši pb kod za stakeholder → stakeholder-service/pb/
WORKDIR /src/stakeholder-service
RUN mkdir -p pb && \
    protoc \
      --go_out=pb       --go_opt=paths=source_relative \
      --go-grpc_out=pb  --go-grpc_opt=paths=source_relative \
      --proto_path=../proto/stakeholder \
      ../proto/stakeholder/stakeholder.proto

# Build (sve .go fajlove u paketu, uključujući grpc_server.go)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/stakeholder-service .

FROM alpine:3.21
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/stakeholder-service /app/stakeholder-service
COPY stakeholder-service/migrations /app/migrations
EXPOSE 8082 9092
ENTRYPOINT ["/app/stakeholder-service"]
