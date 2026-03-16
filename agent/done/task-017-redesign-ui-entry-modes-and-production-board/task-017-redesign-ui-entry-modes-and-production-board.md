# Task: Redesign UI entry modes and production board

```yaml
id: task-017-redesign-ui-entry-modes-and-production-board
title: Design mode-gated UI shells and staff production board redesign
pipeline: architecture
status: done
priority: high
type: architecture
architecture: required
retry_count: 0
created_at: 2026-03-16
requested_by: human
areas:
  - apps/orders-client
  - apps/staff-client
  - apps/production-service
  - apps/users-service
flows:
  - user_authentication
  - menu_browsing
  - order_submission
  - order_production
dependencies: []
validation:
  - Architecture document exists at agent/tasks/task-017-redesign-ui-entry-modes-and-production-board.arch.md
  - Split report exists at agent/tasks/task-017-redesign-ui-entry-modes-and-production-board.split.md
  - Generated implementation tasks use standalone numeric ids such as task-018-<slug>
```

## Summary

Design a cohesive redesign for the customer and staff UIs so both applications start with mode-based entry screens, hide the working interface until a valid session exists, remove the user-visible service footer, and reshape the staff production board into status columns with concise order summaries.

## Requirements

- Remove the bottom service-url strip from the runtime UI in both `orders-client` and `staff-client`.
- For `orders-client`, show only a login landing screen first with two large entry options: registered user and guest.
- For `staff-client`, show only a mode landing screen first with two entry options: interactive and display.
- Preserve the selected logged-in mode in UI session state for later feature gating.
- Redesign the staff board into status columns where each order is placed by derived order status and shows item-count summaries via icons or emoji instead of text labels.
- Keep interactive order detail inspection in staff mode, but keep display mode read-only and customer-facing.
- Split the approved design into implementation-ready tasks.

## Acceptance Criteria

- The architecture document defines the UI mode model, auth gating behavior, board layout, and backend/API implications clearly enough for implementation.
- The design explains how guest, registered, interactive, and display sessions are established and restored.
- The staff board design specifies how mixed item statuses are summarized while the order stays in a single status column.
- The split report creates standalone numbered implementation tasks with clear dependencies.

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to architecture and task decomposition
- Update domain knowledge files if the architecture introduces new concrete flow behavior that must be documented now
- Do not implement product code in this task

## Context

- Related files: `apps/orders-client/src/App.tsx`, `apps/staff-client/src/App.tsx`, `apps/production-service`, `apps/users-service`
- Related docs: `flow-index.yaml`, `domain-brain/flows/user-authentication.md`, `domain-brain/flows/order-production.md`
- Related flows: `user_authentication`, `menu_browsing`, `order_submission`, `order_production`
- Risks or dependencies: the display-mode design may require a read-only backend contract instead of pure frontend-only work

## Out of Scope

- Direct implementation work in the applications or services
- Running implementation tests for downstream tasks
- Pull request creation for downstream implementation tasks

## Notes for Agents

- First visible chat message must identify the current role.
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- Add extra stage-agent audit entries only when receiving retry feedback or blocking the task.
- Supervisor appends lifecycle audit entries for pickup, status changes, handoffs, retry routing, blocking, and archival.
- The architect owns `task-017-redesign-ui-entry-modes-and-production-board.arch.md`.
- The task-splitter owns `task-017-redesign-ui-entry-modes-and-production-board.split.md` and the generated implementation task files.
