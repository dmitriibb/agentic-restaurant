# production-service

Go service for production workflow runtime and staff-facing production APIs.

## Endpoints

- `GET /health/live`
- `GET /health/ready`

## Local run

```powershell
go run ./cmd/production-service
```

Before local run, ensure dependencies are available:

- MySQL (`production_db`)
- RabbitMQ (`restaurant.production.v1`, queue `production-service.item-requested.v1`)
- users-service for token validation

## Test

```powershell
go test ./...
```

## Local smoke verification

From repository root, run:

```powershell
powershell -ExecutionPolicy Bypass -File tests/production-pipeline-smoke.ps1
```

This verifies cross-service runtime wiring from accepted orders through item pickup/ready transitions.
