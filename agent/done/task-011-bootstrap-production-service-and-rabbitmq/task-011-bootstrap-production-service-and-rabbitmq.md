# Task: Bootstrap production-service and RabbitMQ foundation

```yaml
id: task-011-bootstrap-production-service-and-rabbitmq
title: Bootstrap production-service and RabbitMQ foundation
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
  - apps/production-service
  - docker-compose.yml
flows:
  - order_production
dependencies: []
validation:
  - `docker compose config` includes `production-service`, `restaurant-rabbitmq`, and `production_db` wiring
  - `go test ./...` succeeds in `apps/production-service`
```

## Summary

Create the new Go `production-service` skeleton plus the local RabbitMQ and database foundation it needs to exist as a first-class runtime.

## Requirements

- Create `apps/production-service` with Go module, application entry point, config loading, structured logging, and health endpoints.
- Wire `production-service`, RabbitMQ, and `production_db` into local compose configuration.
- Declare the initial exchange and queue contract required by the architecture.
- Add startup configuration for MySQL and RabbitMQ connectivity without implementing business consumers yet.

## Acceptance Criteria

- `production-service` starts locally with configuration for MySQL and RabbitMQ.
- Local runtime config contains RabbitMQ and `production_db` entries consistent with the architecture document.
- Broker declarations for the first production queue are present and covered by tests or startup checks.

## Constraints

- Follow `AGENTS.md` rules.
- Keep changes scoped to foundation work.
- Do not implement production business workflow logic in this task.
- Preserve existing service runtime behavior.

## Context

- Related files: `docker-compose.yml`, `flow-index.yaml`
- Related docs: `agent/tasks/task-010-order-production-pipeline-architecture.arch.md`
- Source architecture: `task-010-order-production-pipeline-architecture`
- Related flows: `order_production`
- Risks or dependencies: service bootstrap choices should not block later consumer and API work.

## Out of Scope

- Outbox publishing in `orders-service`
- Production state persistence
- Staff APIs or frontend work

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Append audit entries to `agent/tasks/<task-id>.agents-audit.md` when starting, handing off, retrying, blocking, and finishing work.
- Resolve `source_architecture` from `agent/done/<source_architecture>/<source_architecture>.arch.md` first, with fallback to `agent/tasks/<source_architecture>.arch.md`.
- Keep queue and exchange naming aligned with the architecture contract to avoid later rewrites.
