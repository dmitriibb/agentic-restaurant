# Implementation Plan

## Task Summary
- Add explicit cross-service production pipeline verification coverage and local runtime documentation for the order-to-production flow.

## Architecture Input
- `source_architecture`: `task-010-order-production-pipeline-architecture`
- Reference: `agent/done/task-010-order-production-pipeline-architecture/task-010-order-production-pipeline-architecture.arch.md`

## Affected Areas
- `apps/orders-service/src/test/kotlin/com/agentic/restaurant/orders/OrdersServiceApplicationTests.kt`
- `apps/production-service/internal/api/handlers_test.go`
- `tests/` (new scripted cross-service verification)
- `README.md`
- `apps/production-service/README.md`

## Steps
1. Extend `orders-service` integration tests to assert the produced outbox payload shape for production-item handoff, not only row counts.
2. Extend `production-service` API tests to cover the item `ready` command path that derives order `READY` and emits both `item.ready` and `order.ready` outbox records.
3. Add a repository-level scripted verification (`tests`) that exercises local runtime wiring across users-service, orders-service, RabbitMQ handoff readiness, production-service, and staff-client-facing APIs.
4. Update top-level and production-service docs with concrete startup and verification commands for the production pipeline runtime.
5. Document remaining automation gap (full browser e2e) in the scripted verification notes.

## Tests
- `mvn test` in `apps/orders-service`
- `go test ./...` in `apps/production-service`
- `npm test` in `apps/staff-client`
- `tests/production-pipeline-smoke.ps1` (scripted local-stack check; manual execution against running compose stack)

## Domain Documentation Updates
- `domain-brain/`: none expected (no business-rule/state-machine change)
- `flow-index.yaml`: none expected (no flow ownership/path mapping change)

## Open Questions
- none
