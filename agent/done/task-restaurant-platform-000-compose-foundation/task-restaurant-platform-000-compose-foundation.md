# Task: Docker Compose Foundation

```yaml
id: task-restaurant-platform-000-compose-foundation
title: Create docker compose for restaurant platform datastores
status: done
priority: high
type: infrastructure
architecture: not_requested
retry_count: 0
created_at: 2026-03-11
requested_by: human
areas:
  - docker-compose.yml
  - apps/users-service
  - apps/menu-service
  - apps/orders-service
flows:
  - user_authentication
  - menu_browsing
  - order_submission
dependencies: []
validation:
  - `docker compose up -d` starts MongoDB and both MySQL instances or databases successfully
  - Datastores expose stable connection settings for later service tasks
  - Health checks report ready status for all required databases
```

## Summary

Create the local Docker Compose foundation required by all backend services. The compose file must provision MongoDB for `menu-service` and MySQL for `users-service` and `orders-service`.

## Requirements

- Add a `docker-compose.yml` file for local development.
- Provision one MongoDB service for menu data.
- Provision MySQL capacity for users and orders with isolated ownership.
- Define persistent volumes, network wiring, and health checks.
- Document environment variables or default credentials expected by the services.

## Acceptance Criteria

- Developers can start the required databases with one compose command.
- MongoDB is reachable by `menu-service`.
- MySQL connectivity is available for both `users-service` and `orders-service`.
- Compose configuration is stable enough to reuse in service bootstrap tasks.

## Constraints

- Keep the scope to local infrastructure only.
- Do not add message brokers or unrelated infrastructure in this task.
- Preserve service-level database ownership.

## Context

- Related files: `agent/tasks/task-restaurant-platform-architecture-001.arch.md`
- Related docs: `flow-index.yaml`, `domain-brain/invariants.md`
- Related flows: `user_authentication`, `menu_browsing`, `order_submission`
- Risks or dependencies: connection details must stay consistent across later init tasks

## Out of Scope

- Application code
- CI/CD infrastructure
- Production deployment manifests

## Notes for Agents

- Prefer clear service names and connection defaults that map directly to later service configs.
