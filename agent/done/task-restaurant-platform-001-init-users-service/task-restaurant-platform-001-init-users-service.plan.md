# Implementation Plan

## Task Summary
- Bootstrap `apps/users-service` as a runnable Kotlin Spring Boot service with MySQL, Liquibase, health/readiness support, and OpenAPI-first structure.
- Add the local datastore compose file needed for the service to run against the expected MySQL instance.

## Architecture Input
- `not requested`
- Task constraints reference `agent/tasks/task-restaurant-platform-architecture-001.arch.md` as the binding service-boundary and stack guidance.

## Affected Areas
- `apps/users-service`
- `docker-compose.yml`
- `.gitignore`
- `agent/tasks/task-restaurant-platform-001-init-users-service.md`

## Steps
1. Create the `users-service` Maven/Kotlin Spring Boot project skeleton with application entrypoint, source/test directories, and app-local README/config structure.
2. Add runtime dependencies and configuration for Spring Web, Actuator, JDBC, Liquibase, validation, and MySQL connectivity with profile-based environment overrides.
3. Add a baseline Liquibase changelog and startup configuration that creates the initial `users` table without introducing login/JWT business behavior yet.
4. Add health/readiness configuration and a lightweight internal readiness verification path that depends on datasource health.
5. Add an OpenAPI contract placeholder under `apps/users-service/api/openapi.yaml` and keep the project structure ready for later generated auth endpoints.
6. Add `docker-compose.yml` with MongoDB, `users-db`, and `orders-db` so the users service can run against stable local database settings expected by later tasks.
7. Add focused tests for application startup, Liquibase baseline application, and readiness health against MySQL using Testcontainers.
8. Record implementation notes in the coder artifact and update task metadata as the pipeline advances.

## Tests
- `mvn test` in `apps/users-service`
- Verify the Spring Boot context starts with a MySQL-backed datasource in tests.
- Verify Liquibase creates the expected baseline schema.
- Verify `/actuator/health/readiness` reports `UP` when the datasource is reachable.

## Domain Documentation Updates
- No `domain-brain/` updates expected because this task bootstraps infrastructure and does not change documented business behavior.
- No `flow-index.yaml` changes expected because `apps/users-service` is already mapped to `user_authentication`.

## Open Questions
- none
