FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o /voicehub-server main.go

# Runtime
FROM alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /app

COPY --from=builder /voicehub-server /app/voicehub-server

EXPOSE 8080

CMD ["/app/voicehub-server"]
