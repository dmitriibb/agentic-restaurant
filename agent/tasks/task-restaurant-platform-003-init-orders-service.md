# Task: Init Orders Service

```yaml
id: task-restaurant-platform-003-init-orders-service
title: Initialize orders-service and verify database connectivity
status: queued
priority: high
type: bootstrap
architecture: not_requested
retry_count: 0
created_at: 2026-03-11
requested_by: human
areas:
  - apps/orders-service
  - docker-compose.yml
flows:
  - order_submission
dependencies:
  - task-restaurant-platform-000-compose-foundation
validation:
  - `orders-service` starts locally against the compose database
  - Liquibase baseline runs successfully on the orders database
  - Service health endpoint reports ready state with database connectivity
  - OpenAPI-first project structure exists for later order endpoints
```

## Summary

Bootstrap `orders-service` as a runnable Kotlin backend service connected to MySQL, without implementing the order business logic yet.

## Requirements

- Create the `apps/orders-service` project skeleton in Kotlin.
- Configure Spring Boot runtime, externalized configuration, and startup profile support.
- Configure MySQL connectivity and Liquibase baseline migration wiring.
- Add health/readiness support to confirm DB access during startup.
- Establish the OpenAPI-first structure for later order endpoints.

## Acceptance Criteria

- The service can start locally with the compose database running.
- Startup proves that the MySQL connection and Liquibase setup work.
- The project structure is ready for generated API contracts and later business logic.
- No order submission logic is required yet.

## Constraints

- Keep this task focused on bootstrap and connectivity.
- Do not implement order creation, idempotency, or service integrations in this task.
- Follow the architecture document for service boundaries and stack choices.

## Context

- Related files: `agent/tasks/task-restaurant-platform-architecture-001.arch.md`
- Related docs: `domain-brain/flows/order-submission.md`
- Related flows: `order_submission`
- Risks or dependencies: database settings must match task 0 outputs

## Out of Scope

- Order persistence model details
- Token validation integration
- Menu lookup integration

## Notes for Agents

- Keep the base project ready for later HTTP clients, Liquibase changelogs, and OpenAPI generation.
