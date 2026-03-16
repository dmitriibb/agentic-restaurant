# Task: Add display-mode auth and board summary API

```yaml
id: task-019-add-display-mode-auth-and-board-summary-api
title: Add display-mode auth and board summary API
pipeline: implementation
status: implementing
priority: high
type: feature
architecture: not_requested
source_architecture: task-017-redesign-ui-entry-modes-and-production-board
retry_count: 1
created_at: 2026-03-16
requested_by: human
areas:
  - apps/production-service
  - apps/users-service
flows:
  - user_authentication
  - order_production
dependencies: []
validation:
  - `Set-Location apps/production-service; go test ./...` succeeds
  - `mvn test` succeeds in `apps/users-service`
```

## Summary

Extend the backend so `staff-client` can run a passwordless but authorized display mode, and expose the per-order item-status summary data needed for the redesigned staff board.

## Requirements

- Add a display-mode application-auth path suitable for `staff-client`.
- Seed or configure a dedicated display application credential in `users-service`.
- Add a read-only display-board endpoint in `production-service` for `APPLICATION` callers only.
- Extend the interactive board summary contract to include per-status item counts for each order.
- Keep order-detail and mutation endpoints restricted to staff roles.
- Ensure the display projection omits customer names, blocked reasons, and mutation affordances.

## Acceptance Criteria

- An application caller can load the display-board summary without human credentials.
- Interactive staff callers still use the existing staff-only auth path.
- Board summary responses expose queued, in-progress, blocked, and ready item counts per order.
- Display callers cannot access mutation endpoints.

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to the task
- Update domain knowledge files when concrete business logic changes
- Add or update tests for behavior changes

## Context

- Related files: `apps/production-service`, `apps/users-service`, existing production board DTOs and auth validation logic
- Related docs: `agent/done/task-017-redesign-ui-entry-modes-and-production-board/task-017-redesign-ui-entry-modes-and-production-board.arch.md`, `domain-brain/flows/user-authentication.md`, `domain-brain/flows/order-production.md`
- Source architecture: `task-017-redesign-ui-entry-modes-and-production-board`
- Related flows: `user_authentication`, `order_production`
- Risks or dependencies: exposing display mode anonymously would be a security regression; keep backend authorization explicit

## Out of Scope

- Frontend rendering changes in `staff-client`
- Orders-client changes

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- Add extra stage-agent audit entries only when receiving retry feedback or blocking the task.
- Supervisor appends lifecycle audit entries for pickup, status changes, handoffs, retry routing, blocking, PR handoff, and archival.
- Resolve `source_architecture` from `agent/done/<source_architecture>/<source_architecture>.arch.md` first, with fallback to `agent/tasks/<source_architecture>.arch.md`.
- Prefer a dedicated display projection instead of reusing an internal interactive DTO with hidden fields.
