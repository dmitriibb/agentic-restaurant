# Task: Implement production state store and RabbitMQ consumers

```yaml
id: task-013-implement-production-state-store-and-consumers
title: Implement production state store and RabbitMQ consumers
pipeline: implementation
status: queued
priority: high
type: feature
architecture: not_requested
source_architecture: task-010-order-production-pipeline-architecture
retry_count: 0
created_at: 2026-03-14
requested_by: human
areas:
  - apps/production-service
flows:
  - order_production
dependencies:
  - task-011-bootstrap-production-service-and-rabbitmq
validation:
  - `go test ./...` succeeds in `apps/production-service`
  - Production service tests cover idempotent consumption and derived order status rules
```

## Summary

Implement the durable production state model in `production-service`, including MySQL persistence, RabbitMQ consumers, idempotency protections, and derived order-status recalculation.

## Requirements

- Add schema and persistence for `production_orders`, `production_items`, `processed_events`, and production outbox records.
- Consume `production.item.requested.v1` events idempotently.
- Materialize one production item per incoming event and create the matching production order aggregate.
- Recalculate production order status transactionally from item states.
- Publish outbound production status events through a local outbox.

## Acceptance Criteria

- Duplicate `production.item.requested.v1` deliveries do not create duplicate production items.
- Production order status reflects item-state counts correctly for queued, in-progress, blocked, ready, and cancelled cases.
- Message acknowledgements occur only after the local transaction commits.
- Tests cover at least one happy path and one duplicate-delivery path.

## Constraints

- Follow `AGENTS.md` rules.
- Keep `production-service` as the only owner of production state.
- Do not implement browser auth or UI in this task.
- Add or update tests for persistence, idempotency, and status-derivation behavior.

## Context

- Related files: `apps/production-service`, `domain-brain/entities/production-order.md`, `domain-brain/entities/production-item.md`
- Related docs: `agent/done/task-010-order-production-pipeline-architecture/task-010-order-production-pipeline-architecture.arch.md`
- Source architecture: `task-010-order-production-pipeline-architecture`
- Related flows: `order_production`
- Risks or dependencies: idempotency and status recalculation logic are the highest-risk parts of the service.

## Out of Scope

- Staff authentication rules
- Production command APIs
- Staff frontend

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- Add extra stage-agent audit entries only when receiving retry feedback or blocking the task.
- Supervisor appends lifecycle audit entries for pickup, status changes, handoffs, retry routing, blocking, PR handoff, and archival.
- Resolve `source_architecture` from `agent/done/<source_architecture>/<source_architecture>.arch.md` first, with fallback to `agent/tasks/<source_architecture>.arch.md`.
- Recompute order state from persisted item facts instead of trusting prior in-memory status.
