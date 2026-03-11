# Implementation Plan

## Task Summary
- Implement end-to-end order submission behavior in `orders-service`: bearer token validation via `users-service`, menu-id resolution via `menu-service`, idempotent `PUT /api/v1/orders/{requestId}`, and MySQL persistence for orders with immutable line snapshots.

## Architecture Input
- `not requested`
- aligned with `agent/tasks/task-restaurant-platform-architecture-001.arch.md`

## Affected Areas
- `apps/orders-service/api/openapi.yaml`
- `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/api`
- `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/application`
- `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/clients`
- `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/persistence`
- `apps/orders-service/src/main/resources/application.yml`
- `apps/orders-service/src/main/resources/application-local.yml`
- `apps/orders-service/src/test/resources/application-integration.yml`
- `apps/orders-service/src/test/kotlin/com/agentic/restaurant/orders/OrdersServiceApplicationTests.kt`

## Steps
1. Replace placeholder OpenAPI with concrete idempotent order submission contract and security/error responses.
2. Add API DTOs and controller for `PUT /api/v1/orders/{requestId}` with bearer header extraction and response mapping.
3. Implement application service for auth validation, user matching, menu resolution, idempotent lookup, and order creation.
4. Implement outbound clients to `users-service` and `menu-service` internal endpoints.
5. Implement JDBC persistence for order lookup and transactional create of order + order_lines snapshots.
6. Add runtime config properties for downstream URLs and service tokens.
7. Expand integration tests to cover validation failures, idempotency, and persistence snapshots.
8. Run validation commands and publish task artifacts.

## Tests
- `docker compose up -d --wait orders-db`
- `mvn test`
- `mvn -DskipTests package`

## Domain Documentation Updates
- No `domain-brain` or `flow-index.yaml` update required; implementation matches existing `order_submission` flow and invariants.

## Open Questions
- none
