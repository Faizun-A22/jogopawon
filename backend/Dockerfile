# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk update && apk add --no-cache ca-certificates git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build Linux binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server main.go

# Production Stage
FROM alpine:3.19

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata curl
ENV TZ=Asia/Jakarta

COPY --from=builder /app/server .
COPY --from=builder /app/database ./database

EXPOSE 8080

CMD ["./server"]
