# Implementation Plan

## Task Summary
- Bootstrap `apps/menu-service` as a runnable Java 21 Spring Boot service with MongoDB, health/readiness support, and OpenAPI-first structure.
- Keep scope strictly on bootstrap and datastore connectivity, without menu business logic or auth integration.

## Architecture Input
- `not requested`
- Task references `agent/tasks/task-restaurant-platform-architecture-001.arch.md` for stack and boundary guidance.

## Affected Areas
- `apps/menu-service`
- `agent/tasks/task-restaurant-platform-002-init-menu-service.md`

## Steps
1. Create a Java 21 Maven Spring Boot skeleton for `menu-service` with source, test, and API contract directories.
2. Add runtime dependencies for Spring Web, Actuator, Validation, MongoDB, and Springdoc.
3. Configure externalized MongoDB connectivity and actuator readiness probes that include Mongo health.
4. Add startup runtime verification that enforces Java feature version 21.
5. Add an OpenAPI placeholder contract under `apps/menu-service/api/openapi.yaml` for future generated menu endpoints.
6. Add focused integration tests validating Mongo connectivity and readiness endpoint behavior against compose Mongo.
7. Run bootstrap validation commands and record outcomes in test/review artifacts.

## Tests
- `docker compose config`
- `docker compose up -d --wait mongo`
- `mvn test` in `apps/menu-service`
- `mvn -DskipTests package` in `apps/menu-service`

## Domain Documentation Updates
- No `domain-brain/` updates expected because task scope is infrastructure bootstrap only.
- No `flow-index.yaml` updates expected because `apps/menu-service` is already mapped to `menu_browsing`.

## Open Questions
- none
