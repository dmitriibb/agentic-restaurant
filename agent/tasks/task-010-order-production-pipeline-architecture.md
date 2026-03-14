# Task: Order Production Pipeline Architecture

```yaml
id: task-010-order-production-pipeline-architecture
title: Design architecture for order production pipeline
pipeline: architecture
status: done
priority: high
type: architecture
architecture: required
retry_count: 0
created_at: 2026-03-14
requested_by: human
areas:
  - apps/orders-service
  - apps/users-service
  - apps/production-service
  - apps/staff-client
  - domain-brain
  - docker-compose.yml
flows:
  - order_submission
  - order_production
dependencies: []
validation:
  - Architecture document exists at agent/tasks/task-010-order-production-pipeline-architecture.arch.md
  - Split report exists at agent/tasks/task-010-order-production-pipeline-architecture.split.md
  - Generated implementation tasks use standalone numeric ids such as task-011-<slug>
```

## Summary

Design a production-grade kitchen pipeline that starts when an order is accepted, tracks work per production item through RabbitMQ events, and gives staff a dedicated web app for pickup and ready actions.

## Requirements

- Introduce a dedicated backend service that owns operational order production state.
- Use RabbitMQ for asynchronous handoff and order-item status events.
- Model production progress per item unit and derive order readiness when all active items are ready.
- Define sensible status enums for order and production item lifecycles.
- Design a staff-facing web app for viewing and updating production work.
- Keep existing order submission ownership in `orders-service` and avoid direct cross-service database access.
- Update domain knowledge and flow routing for the new production flow.

## Acceptance Criteria

- A structured architecture document exists and covers service boundaries, event flow, status enums, data ownership, APIs, and reliability concerns.
- `domain-brain/` and `flow-index.yaml` describe the new production domain and stay consistent with the proposed architecture.
- A split report exists and implementation-ready task files are generated with standalone numeric ids.
- Blocking open questions are either resolved in the design or explicitly called out as future decisions.

## Constraints

- Follow `AGENTS.md` rules.
- Keep changes scoped to architecture and task decomposition.
- Do not implement product code in this task.
- Preserve `orders-service` ownership of accepted order payloads.
- New backend services must follow the repository convention of using Go unless there is a justified exception.

## Context

- Related files: `flow-index.yaml`, `domain-brain/`, `apps/orders-service`, `apps/users-service`, `docker-compose.yml`
- Related docs: `README.md`, `agent/pipeline.yaml`, `agent/architect/AGENT.md`
- Related flows: `order_submission`, `user_authentication`
- Risks or dependencies: introducing asynchronous production flow adds delivery, ordering, and idempotency concerns that must be handled explicitly.

## Out of Scope

- Implementing RabbitMQ, backend code, or frontend code.
- Customer-facing order tracking changes in `orders-client`.
- Advanced station routing, inventory reservation, or payment coupling.

## Notes for Agents

- Use the architecture artifact as the source of truth for follow-on implementation tasks.
- Keep later work aligned with the status model and ownership boundaries documented here.
