# Task: Initial Restaurant Platform Architecture

```yaml
id: task-restaurant-platform-architecture-001
title: Design the initial restaurant platform architecture
status: done
priority: high
type: architecture
architecture: required
retry_count: 0
created_at: 2026-03-11
requested_by: human
areas:
  - apps/menu-service
  - apps/orders-service
  - apps/users-service
  - apps/orders-client
  - domain-brain
flows:
  - user_authentication
  - menu_browsing
  - order_submission
dependencies: []
validation:
  - Architecture document exists at agent/tasks/task-restaurant-platform-architecture-001.arch.md
  - flow-index.yaml contains restaurant-specific flow mappings
  - domain-brain contains restaurant-specific glossary, invariants, entities, and flows
```

## Summary

Design an initial but scalable architecture for a restaurant platform with separate menu, orders, users, and web client applications. The design must stay easy to split into later implementation tasks and must seed the repository with the first concrete product-specific domain knowledge.

## Requirements

- Define a `menu-service` in Java 21 with OpenAPI-first development and MongoDB persistence.
- Define an `orders-service` in Kotlin with OpenAPI-first development, MySQL persistence, and Liquibase migrations.
- Define a `users-service` in Kotlin for login/password authentication, JWT issuance, JWT validation, MySQL persistence, Liquibase migrations, and five predefined users.
- Define a React web client named `orders-client` that logs in, stores a token, fetches menu data, manages a basket, and submits orders.
- Keep the initial architecture basic enough to implement quickly while preserving clear boundaries for future scaling.
- Update repository domain knowledge and flow routing so later agents can build against a stable domain model.

## Acceptance Criteria

- A structured architecture document exists for the requested platform design.
- The design includes service boundaries, persistence ownership, API contracts, security model, scalability notes, and task-splitting guidance.
- Domain flows, invariants, and entities are documented for authentication, menu browsing, and order submission.
- `flow-index.yaml` maps the new flows to the planned application paths.

## Constraints

- Follow `AGENTS.md` rules.
- Keep changes scoped to architecture and domain documentation.
- Do not implement application code in this task.
- Preserve service-owned databases and avoid direct cross-service database access.
- Keep the design API-first and suitable for future microservice expansion.

## Context

- Related files: `flow-index.yaml`, `domain-brain/`, `agent/architect/AGENT.md`
- Related docs: repository `README.md`, `agent/pipeline.yaml`
- Related flows: `user_authentication`, `menu_browsing`, `order_submission`
- Risks or dependencies: JWT validation on every request adds latency and centralizes availability on `users-service`; this must be acknowledged in the design.

## Out of Scope

- Payments, delivery, kitchen operations, inventory, loyalty, analytics, or notification workflows.
- CI/CD implementation, infrastructure-as-code, and production deployment manifests.
- Concrete code generation setup, tests, or runnable services.

## Notes for Agents

- Use this architecture artifact as the source of truth before planning implementation work.
- Keep later tasks aligned with the service boundaries and invariants documented here.
