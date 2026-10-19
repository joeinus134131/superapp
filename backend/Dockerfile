FROM golang:1.26-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/whenya-api ./cmd/api && \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/whenya-migrate ./cmd/migrate

FROM alpine:3.23
RUN apk add --no-cache ca-certificates tzdata && addgroup -S -g 10001 whenya && adduser -S -u 10001 -G whenya whenya
WORKDIR /app
COPY --from=builder /out/ /app/
USER 10001:10001
EXPOSE 8080
CMD ["/app/whenya-api"]
