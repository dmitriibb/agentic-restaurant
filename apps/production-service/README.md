# production-service

Go service foundation for production workflow runtime.

## Endpoints

- `GET /health/live`
- `GET /health/ready`

## Local run

```powershell
go run ./cmd/production-service
```

## Test

```powershell
go test ./...
```