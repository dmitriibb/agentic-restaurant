# Task: Add staff-client mode selection and display session

```yaml
id: task-020-add-staff-client-mode-selection-and-display-session
title: Add staff-client mode selection and display session
pipeline: implementation
status: done
priority: high
type: feature
architecture: not_requested
source_architecture: task-017-redesign-ui-entry-modes-and-production-board
retry_count: 0
created_at: 2026-03-16
requested_by: human
areas:
  - apps/staff-client
flows:
  - user_authentication
  - order_production
dependencies:
  - task-019-add-display-mode-auth-and-board-summary-api
validation:
  - `npm test` succeeds in `apps/staff-client`
  - `npm run build` succeeds in `apps/staff-client`
```

## Summary

Refactor `staff-client` so it starts on a mode-selection landing screen, supports both interactive and display sessions as explicit UI modes, and removes the service footer from the visible runtime UI.

## Requirements

- Replace the current immediate login-and-board shell with a landing screen containing `Interactive` and `Display`.
- Show a dedicated username/password step for interactive mode.
- Acquire and hold the display-mode application token only when display mode is selected.
- Persist explicit UI mode metadata (`interactive` or `display`) as part of the client session model.
- Show a top-right mode chip after the session is established.
- Remove the visible service footer from the user-facing UI.
- Keep display mode read-only and do not render production command controls there.

## Acceptance Criteria

- Before a mode is selected, the production board is not rendered.
- Interactive mode still allows a staff user to sign in.
- Display mode can establish a read-only session without asking for username or password.
- The header shows `Mode: interactive` or `Mode: display` once the session is active.
- The visible service footer strip is gone.

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to the task
- Update domain knowledge files when concrete business logic changes
- Add or update tests for behavior changes

## Context

- Related files: `apps/staff-client/src/App.tsx`, `apps/staff-client/src/styles.css`, `apps/staff-client/src/features/auth/session.ts`, `apps/staff-client/src/App.test.tsx`
- Related docs: `agent/done/task-017-redesign-ui-entry-modes-and-production-board/task-017-redesign-ui-entry-modes-and-production-board.arch.md`
- Source architecture: `task-017-redesign-ui-entry-modes-and-production-board`
- Related flows: `user_authentication`, `order_production`
- Risks or dependencies: depends on the backend display-mode contract from `task-019-add-display-mode-auth-and-board-summary-api`

## Out of Scope

- The full status-lane board redesign
- Backend auth and summary API work

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- Add extra stage-agent audit entries only when receiving retry feedback or blocking the task.
- Supervisor appends lifecycle audit entries for pickup, status changes, handoffs, retry routing, blocking, PR handoff, and archival.
- Resolve `source_architecture` from `agent/done/<source_architecture>/<source_architecture>.arch.md` first, with fallback to `agent/tasks/<source_architecture>.arch.md`.
- Keep display-mode tokens in memory and reacquire them after reload instead of storing them in browser storage.
