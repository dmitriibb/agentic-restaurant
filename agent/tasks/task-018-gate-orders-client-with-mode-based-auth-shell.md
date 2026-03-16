# Task: Gate orders-client with mode-based auth shell

```yaml
id: task-018-gate-orders-client-with-mode-based-auth-shell
title: Gate orders-client with mode-based auth shell
pipeline: implementation
status: queued
priority: high
type: feature
architecture: not_requested
source_architecture: task-017-redesign-ui-entry-modes-and-production-board
retry_count: 0
created_at: 2026-03-16
requested_by: human
areas:
  - apps/orders-client
flows:
  - user_authentication
  - menu_browsing
  - order_submission
dependencies: []
validation:
  - `npm test` succeeds in `apps/orders-client`
  - `npm run build` succeeds in `apps/orders-client`
```

## Summary

Refactor `orders-client` so logged-out users see only a mode-based entry screen, the chosen mode is stored in UI session state, the working interface appears only after successful authentication, and the service footer is removed from the runtime UI.

## Requirements

- Replace the current always-rendered three-panel shell with a mode-gated entry flow.
- Render two primary entry actions on first load: `Login as Registered` and `Login as Guest`.
- Show a dedicated credential step for the registered path and a dedicated name-only step for the guest path.
- Store explicit UI mode metadata (`registered` or `guest`) alongside the authenticated session.
- Show a top-right mode chip after authentication and keep the main layout focused on menu and basket work.
- Remove the visible service footer from the user-facing UI.
- Make guest application-token acquisition lazy instead of running it on initial page load.

## Acceptance Criteria

- Before authentication, menu and basket content are not rendered.
- Registered login still works, but the main interface appears only after success.
- Guest login still works, but the app token is acquired only when the guest flow is used.
- The logged-in shell shows `Mode: registered user` or `Mode: guest`.
- The service footer strip is no longer visible.

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to the task
- Update domain knowledge files when concrete business logic changes
- Add or update tests for behavior changes

## Context

- Related files: `apps/orders-client/src/App.tsx`, `apps/orders-client/src/styles.css`, `apps/orders-client/src/features/auth/session.ts`, `apps/orders-client/src/features/auth/appToken.ts`, `apps/orders-client/src/App.test.tsx`
- Related docs: `agent/done/task-017-redesign-ui-entry-modes-and-production-board/task-017-redesign-ui-entry-modes-and-production-board.arch.md`
- Source architecture: `task-017-redesign-ui-entry-modes-and-production-board`
- Related flows: `user_authentication`, `menu_browsing`, `order_submission`
- Risks or dependencies: do not accidentally regress the existing guest and registered API contracts while changing the UI flow

## Out of Scope

- Backend auth or order API changes
- Staff-client work

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- Add extra stage-agent audit entries only when receiving retry feedback or blocking the task.
- Supervisor appends lifecycle audit entries for pickup, status changes, handoffs, retry routing, blocking, PR handoff, and archival.
- Resolve `source_architecture` from `agent/done/<source_architecture>/<source_architecture>.arch.md` first, with fallback to `agent/tasks/<source_architecture>.arch.md`.
- Implement the requested “open another window” behavior as an in-app step or panel, not a browser popup.
