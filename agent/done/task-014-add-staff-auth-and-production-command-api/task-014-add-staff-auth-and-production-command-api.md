# Task: Add staff auth and production command API

```yaml
id: task-014-add-staff-auth-and-production-command-api
title: Add staff auth and production command API
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
  - apps/users-service
flows:
  - user_authentication
  - order_production
dependencies:
  - task-013-implement-production-state-store-and-consumers
validation:
  - `go test ./...` succeeds in `apps/production-service`
  - `mvn test` succeeds in `apps/users-service`
```

## Summary

Expose staff-facing production read and command APIs and secure them with staff-role authorization through `users-service`.

## Requirements

- Add or seed staff-capable roles and accounts needed for local development.
- Protect `production-service` endpoints with bearer-token validation and role checks.
- Implement read endpoints for the production board and order detail views.
- Implement command endpoints for `pickup`, `block`, `resume`, and `ready`.
- Record acting staff identity and enforce transition guards with conflict responses on invalid state changes.

## Acceptance Criteria

- `STAFF` and `MANAGER` callers can load the board and mutate allowed production items.
- Unauthorized or insufficient-role callers are rejected.
- Invalid transitions return `409 Conflict` and leave state unchanged.
- Tests cover at least one success path and one authorization or transition failure path.

## Constraints

- Follow `AGENTS.md` rules.
- Keep auth ownership in `users-service`.
- Keep production-state ownership in `production-service`.
- Add or update tests for authorization and command behavior changes.

## Context

- Related files: `apps/production-service`, `apps/users-service`
- Related docs: `agent/done/task-010-order-production-pipeline-architecture/task-010-order-production-pipeline-architecture.arch.md`
- Source architecture: `task-010-order-production-pipeline-architecture`
- Related flows: `user_authentication`, `order_production`
- Risks or dependencies: transition guards and actor auditing are critical for operational integrity.

## Out of Scope

- Staff frontend implementation
- Customer-facing order-status projection
- Advanced manager-only override workflows beyond the agreed command set

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- Add extra stage-agent audit entries only when receiving retry feedback or blocking the task.
- Supervisor appends lifecycle audit entries for pickup, status changes, handoffs, retry routing, blocking, PR handoff, and archival.
- Resolve `source_architecture` from `agent/done/<source_architecture>/<source_architecture>.arch.md` first, with fallback to `agent/tasks/<source_architecture>.arch.md`.
- Derive the acting staff user from the validated token rather than trusting request payload identity.
