# Task: Build staff-client production board

```yaml
id: task-015-build-staff-client-production-board
title: Build staff-client production board
pipeline: implementation
status: pr_created
priority: high
type: feature
architecture: not_requested
source_architecture: task-010-order-production-pipeline-architecture
retry_count: 0
created_at: 2026-03-14
requested_by: human
areas:
  - apps/staff-client
flows:
  - user_authentication
  - order_production
dependencies:
  - task-014-add-staff-auth-and-production-command-api
validation:
  - `npm test` succeeds in `apps/staff-client`
  - `npm run build` succeeds in `apps/staff-client`
```

## Summary

Create the dedicated staff web app for loading the production board, showing live kitchen work, and sending item lifecycle commands to `production-service`.

## Requirements

- Create `apps/staff-client` as a separate React app.
- Implement staff login and session handling against `users-service`.
- Render production orders and items grouped by operational status.
- Support item actions for `pickup`, `block`, `resume`, and `ready`.
- Use SSE for live updates with a polling fallback.
- Keep the UI responsive for desktop and tablet-sized screens used by staff.

## Acceptance Criteria

- Staff users can sign in and load the current production board.
- The board shows enough detail to identify order, item, and current status.
- Item commands invoke the correct backend endpoints and update the UI state.
- Tests cover login/session behavior and at least one board action flow.

## Constraints

- Follow `AGENTS.md` rules.
- Keep the app separate from `orders-client`.
- Do not connect the browser directly to RabbitMQ.
- Add or update tests for staff workflow behavior changes.

## Context

- Related files: `apps/orders-client` for frontend conventions, `apps/users-service`, `apps/production-service`
- Related docs: `agent/done/task-010-order-production-pipeline-architecture/task-010-order-production-pipeline-architecture.arch.md`
- Source architecture: `task-010-order-production-pipeline-architecture`
- Related flows: `user_authentication`, `order_production`
- Risks or dependencies: the UI depends on stable production-service query and command contracts.

## Out of Scope

- Customer-facing order tracking
- Menu browsing or order submission UX
- Direct broker visibility in the browser

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- Add extra stage-agent audit entries only when receiving retry feedback or blocking the task.
- Supervisor appends lifecycle audit entries for pickup, status changes, handoffs, retry routing, blocking, PR handoff, and archival.
- Resolve `source_architecture` from `agent/done/<source_architecture>/<source_architecture>.arch.md` first, with fallback to `agent/tasks/<source_architecture>.arch.md`.
- Keep the UI terminology aligned with the status and action names from the architecture document.
