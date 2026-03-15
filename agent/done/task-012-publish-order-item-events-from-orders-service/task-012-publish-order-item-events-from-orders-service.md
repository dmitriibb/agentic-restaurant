# Task: Publish per-item production request events from orders-service

```yaml
id: task-012-publish-order-item-events-from-orders-service
title: Publish per-item production request events from orders-service
pipeline: implementation
status: done
priority: high
type: feature
architecture: not_requested
source_architecture: task-010-order-production-pipeline-architecture
retry_count: 0
created_at: 2026-03-14
requested_by: human
areas:
  - apps/orders-service
flows:
  - order_submission
  - order_production
dependencies:
  - task-011-bootstrap-production-service-and-rabbitmq
validation:
  - `mvn test` succeeds in `apps/orders-service`
  - Orders integration tests cover per-item outbox creation and retry-safe publishing behavior
```

## Summary

Extend `orders-service` so every accepted order produces RabbitMQ-ready outbox events per production item unit without changing the synchronous `ACCEPTED` intake contract.

## Requirements

- Add stable `lineNumber` handling for submitted order lines.
- Persist one outbox record per quantity unit after the order commit succeeds.
- Implement or wire an outbox publisher for `production.item.requested.v1`.
- Include the event envelope and payload fields defined in the source architecture.
- Keep order submission idempotent and safe under duplicate publish attempts.

## Acceptance Criteria

- Accepted orders generate the expected number of outbox rows based on total quantity.
- The publisher emits one message per production item unit with the required routing key and payload shape.
- Temporary RabbitMQ publishing failure does not change the synchronous order acceptance result.
- Duplicate publish retries do not create duplicate accepted orders.

## Constraints

- Follow `AGENTS.md` rules.
- Keep `orders-service` as the owner of accepted orders and line snapshots.
- Do not implement production-state consumers in this task.
- Add or update tests for event and idempotency behavior changes.

## Context

- Related files: `apps/orders-service`, `domain-brain/flows/order-submission.md`
- Related docs: `agent/done/task-010-order-production-pipeline-architecture/task-010-order-production-pipeline-architecture.arch.md`
- Source architecture: `task-010-order-production-pipeline-architecture`
- Related flows: `order_submission`, `order_production`
- Risks or dependencies: event payload shape must stay stable because downstream consumers depend on it.

## Out of Scope

- `production-service` persistence and consumer logic
- Staff APIs
- Staff frontend

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- Add extra stage-agent audit entries only when receiving retry feedback or blocking the task.
- Supervisor appends lifecycle audit entries for pickup, status changes, handoffs, retry routing, blocking, PR handoff, and archival.
- Resolve `source_architecture` from `agent/done/<source_architecture>/<source_architecture>.arch.md` first, with fallback to `agent/tasks/<source_architecture>.arch.md`.
- Preserve the existing `SubmitOrderResponse.status = ACCEPTED` behavior for the synchronous response.








