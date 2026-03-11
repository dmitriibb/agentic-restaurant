# Task: Init Users Service

```yaml
id: task-restaurant-platform-001-init-users-service
title: Initialize users-service and verify database connectivity
status: queued
priority: high
type: bootstrap
architecture: not_requested
retry_count: 0
created_at: 2026-03-11
requested_by: human
areas:
  - apps/users-service
  - docker-compose.yml
flows:
  - user_authentication
dependencies:
  - task-restaurant-platform-000-compose-foundation
validation:
  - `users-service` starts locally against the compose database
  - Liquibase baseline runs successfully on the users database
  - Service health endpoint reports ready state with database connectivity
  - OpenAPI-first project structure exists for later auth endpoints
```

## Summary

Bootstrap `users-service` as a runnable Kotlin backend service connected to MySQL, without implementing the full business logic yet.

## Requirements

- Create the `apps/users-service` project skeleton in Kotlin.
- Configure Spring Boot runtime, externalized configuration, and startup profile support.
- Configure MySQL connectivity and Liquibase baseline migration wiring.
- Add health/readiness support to confirm DB access during startup.
- Establish the OpenAPI-first structure for later login and token validation endpoints.

## Acceptance Criteria

- The service can start locally with the compose database running.
- Startup proves that the MySQL connection and Liquibase setup work.
- The project structure is ready for generated API contracts and later business logic.
- No authentication business behavior is required yet.

## Constraints

- Keep this task focused on bootstrap and connectivity.
- Do not implement login, JWT issuance, or seeded users in this task.
- Follow the architecture document for service boundaries and stack choices.

## Context

- Related files: `agent/tasks/task-restaurant-platform-architecture-001.arch.md`
- Related docs: `domain-brain/flows/user-authentication.md`
- Related flows: `user_authentication`
- Risks or dependencies: database settings must match task 0 outputs

## Out of Scope

- Login endpoint behavior
- JWT generation or validation
- Demo user seed data

## Notes for Agents

- Favor a minimal runnable slice that keeps later business logic work additive rather than corrective.
