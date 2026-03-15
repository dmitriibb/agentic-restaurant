# Plan Report

## Scope
- Bootstrap `apps/production-service` as a Go runtime foundation.
- Wire `production-service`, `restaurant-rabbitmq`, and `production_db` in compose and DB init.
- Add initial broker contract declaration and connectivity checks.

## Implementation Steps
1. Scaffold new Go module and service entrypoint.
2. Implement env config loading and validation.
3. Add structured logging and health endpoints.
4. Add RabbitMQ topology bootstrap for exchange/queue/DLQ/bindings.
5. Add startup connectivity checks for MySQL and RabbitMQ.
6. Wire infra in `docker-compose.yml` and `infra/mysql/init-databases.sql`.
7. Update `flow-index.yaml` messaging section.
8. Add unit tests for config, health, and topology declaration behavior.

## Validation Plan
- Run `go test ./...` in `apps/production-service`.
- Run `docker compose config` and verify `production-service`, `restaurant-rabbitmq`, `production_db` wiring.