# Implementation Plan

## Task Summary

- Split the approved restaurant platform architecture into an execution-ready task queue.
- Keep the sequence aligned with the requested order: infrastructure, service bootstrap, client bootstrap, then business logic.

## Architecture Input

- `required`
- Source: `agent/tasks/task-restaurant-platform-architecture-001.arch.md`

## Affected Areas

- `docker-compose.yml`
- `apps/users-service`
- `apps/menu-service`
- `apps/orders-service`
- `apps/orders-client`
- `agent/tasks/`

## Steps

1. Create `task-restaurant-platform-000-compose-foundation` for local database infrastructure.
2. Create `task-restaurant-platform-001-init-users-service` for Kotlin service bootstrap and MySQL connectivity.
3. Create `task-restaurant-platform-002-init-menu-service` for Java 21 service bootstrap and Mongo connectivity.
4. Create `task-restaurant-platform-003-init-orders-service` for Kotlin service bootstrap and MySQL connectivity.
5. Create `task-restaurant-platform-004-init-orders-client` for React application bootstrap.
6. Create `task-restaurant-platform-005-implement-users-service` for authentication and JWT business logic.
7. Create `task-restaurant-platform-006-implement-menu-service` for menu catalog business logic.
8. Create `task-restaurant-platform-007-implement-orders-service` for order intake business logic.
9. Create `task-restaurant-platform-008-implement-orders-client` for login, menu, basket, and order submission UX.
10. Set dependencies so each business-logic task waits for its bootstrap task and its required upstream services.

## Tests

- Task 0 validates Docker Compose startup and datastore readiness.
- Tasks 1-4 validate application startup and dependency connectivity.
- Tasks 5-8 validate business behavior with unit, integration, and end-to-end checks appropriate to each app.

## Domain Documentation Updates

- No immediate `domain-brain/` updates are required just to split the work into tasks.
- Tasks 5-8 must update `domain-brain/` and `flow-index.yaml` if implementation changes the documented flows, module paths, or invariants.

## Open Questions

- None beyond the open questions already recorded in `task-restaurant-platform-architecture-001.arch.md`.
