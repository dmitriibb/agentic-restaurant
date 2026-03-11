# Implementation Plan

## Task Summary
- Bootstrap `apps/orders-service` as a runnable Kotlin 21 Spring Boot service with MySQL + Liquibase readiness wiring.
- Keep scope on startup/connectivity/OpenAPI structure only, without implementing order business behavior.

## Architecture Input
- `not requested`
- Task references `agent/tasks/task-restaurant-platform-architecture-001.arch.md` for stack and service boundary guidance.

## Affected Areas
- `apps/orders-service`
- `agent/tasks/task-restaurant-platform-003-init-orders-service.md`

## Steps
1. Create a Kotlin 21 Maven Spring Boot skeleton for `orders-service` with source, resources, tests, and API contract directories.
2. Add runtime dependencies for Spring Web, Actuator, Validation, JDBC, Liquibase, MySQL, and Springdoc.
3. Configure externalized MySQL connectivity and Liquibase changelog bootstrap.
4. Add actuator readiness probes that include `db` health.
5. Add placeholder OpenAPI contract for `PUT /api/v1/orders/{requestId}`.
6. Add baseline Liquibase schema for `orders` and `order_lines`.
7. Add integration tests for Liquibase table creation and readiness endpoint health.
8. Run compose + Maven validation and write tester/reviewer artifacts.

## Tests
- `docker compose config`
- `docker compose up -d --wait orders-db`
- `mvn test`
- `mvn -DskipTests package`

## Domain Documentation Updates
- No `domain-brain/` updates expected for bootstrap-only scope.
- No `flow-index.yaml` updates expected because `apps/orders-service` is already mapped under `order_submission`.

## Open Questions
- none
