# Task: Init Menu Service

```yaml
id: task-restaurant-platform-002-init-menu-service
title: Initialize menu-service and verify database connectivity
status: done
priority: high
type: bootstrap
architecture: not_requested
retry_count: 0
created_at: 2026-03-11
requested_by: human
areas:
  - apps/menu-service
  - docker-compose.yml
flows:
  - menu_browsing
dependencies:
  - task-restaurant-platform-000-compose-foundation
validation:
  - `menu-service` starts locally against MongoDB from compose
  - Service health endpoint reports ready state with Mongo connectivity
  - Java 21 runtime is configured and verified at startup
  - OpenAPI-first project structure exists for later menu endpoints
```

## Summary

Bootstrap `menu-service` as a runnable Java 21 backend service connected to MongoDB, without implementing the menu business logic yet.

## Requirements

- Create the `apps/menu-service` project skeleton in Java 21.
- Configure Spring Boot runtime and externalized settings.
- Configure MongoDB connectivity and startup health checks.
- Establish the OpenAPI-first structure for later menu endpoints and generated classes.
- Keep the service runnable as a standalone process.

## Acceptance Criteria

- The service starts locally with the compose MongoDB instance running.
- Startup proves that MongoDB connectivity works.
- The project structure is ready for generated API contracts and later business logic.
- No menu retrieval or auth validation behavior is required yet.

## Constraints

- Keep this task focused on bootstrap and connectivity.
- Do not implement menu item persistence, reads, or internal resolve logic in this task.
- Keep the service aligned with Java 21 and the selected backend conventions.

## Context

- Related files: `agent/tasks/task-restaurant-platform-architecture-001.arch.md`
- Related docs: `domain-brain/flows/menu-browsing.md`
- Related flows: `menu_browsing`
- Risks or dependencies: service config must stay compatible with task 0 compose outputs

## Out of Scope

- Menu item CRUD or read logic
- Auth validation integration
- Seeded menu data

## Notes for Agents

- Leave clean extension points for Mongo repositories, generated APIs, and future auth filters.

