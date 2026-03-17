# Task: Redesign staff board into status lanes and detail rail

```yaml
id: task-021-redesign-staff-board-into-status-lanes-and-detail-rail
title: Redesign staff board into status lanes and detail rail
pipeline: implementation
status: pr_created
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
  - order_production
dependencies:
  - task-019-add-display-mode-auth-and-board-summary-api
  - task-020-add-staff-client-mode-selection-and-display-session
validation:
  - `npm test` succeeds in `apps/staff-client`
  - `npm run build` succeeds in `apps/staff-client`
```

## Summary

Redesign the `staff-client` production board into status columns with concise emoji-based order summaries, while keeping interactive order details in a separate rail and making display mode non-interactive.

## Requirements

- Replace the current list-first board with four order-status lanes: queued, in progress, blocked, and ready.
- Place each order card by derived order status, not by individual item distribution.
- Render per-order item-status counts using emoji or icon markers instead of visible status labels.
- Keep interactive order selection and detail inspection in a dedicated rail or equivalent separate panel.
- Hide detail selection and mutation controls in display mode.
- Provide accessible labels or screen-reader text for the emoji summaries.

## Acceptance Criteria

- Orders appear in the lane that matches `order.Status`.
- Mixed item states remain summarized within one card instead of duplicating the order across lanes.
- Interactive mode still supports order selection, detail loading, and item commands.
- Display mode shows read-only status cards without detail or command controls.
- Tests cover at least one mixed-status summary case and one interactive detail flow.

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to the task
- Update domain knowledge files when concrete business logic changes
- Add or update tests for behavior changes

## Context

- Related files: `apps/staff-client/src/App.tsx`, `apps/staff-client/src/styles.css`, production order summary DTO consumers, `apps/staff-client/src/App.test.tsx`
- Related docs: `agent/done/task-017-redesign-ui-entry-modes-and-production-board/task-017-redesign-ui-entry-modes-and-production-board.arch.md`, `domain-brain/flows/order-production.md`
- Source architecture: `task-017-redesign-ui-entry-modes-and-production-board`
- Related flows: `order_production`
- Risks or dependencies: depends on the summary counts exposed by `task-019-add-display-mode-auth-and-board-summary-api`

## Out of Scope

- Staff-client login/session-mode establishment
- Backend authorization changes

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- Add extra stage-agent audit entries only when receiving retry feedback or blocking the task.
- Supervisor appends lifecycle audit entries for pickup, status changes, handoffs, retry routing, blocking, PR handoff, and archival.
- Resolve `source_architecture` from `agent/done/<source_architecture>/<source_architecture>.arch.md` first, with fallback to `agent/tasks/<source_architecture>.arch.md`.
- Keep the emoji summary compact, but do not sacrifice accessibility or the “one order, one lane” rule.
