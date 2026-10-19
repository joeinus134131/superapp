# SuperApp Backend

This is the Golang-based backend service for SuperApp.

## Getting Started

### Prerequisites
- Go 1.22+

### Running Locally
```bash
go run cmd/api/main.go
```

### Docker
```bash
docker build -t superapp-backend .
docker run -p 8080:8080 superapp-backend
```

## Structure
- `cmd/api`: Entry point for the API service.
- `internal`: Internal business logic.
- `pkg`: Publicly shareable code.
