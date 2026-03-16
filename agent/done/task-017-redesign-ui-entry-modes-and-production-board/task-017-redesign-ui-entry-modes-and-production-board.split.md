# Task Split Report

## Architecture Summary

- Gate both UIs behind explicit entry-mode screens so the working interface is hidden until a valid session exists.
- Remove the visible service footer from `orders-client` and `staff-client`.
- Treat UI mode as first-class session state: `registered`, `guest`, `interactive`, or `display`.
- Redesign the staff board into order-status lanes with emoji-based item-status summaries.
- Add a read-only display-board backend contract so the customer-facing staff screen stays passwordless for humans without becoming anonymous.

## Numbering Strategy

- Selected the next standalone task ids `task-018` through `task-021`.
- Kept the decomposition explicit through `dependencies`.
- Did not use letter-suffixed child ids.

## Generated Tasks

| Order | Task ID | Title | Depends On | Areas |
|---|---|---|---|---|
| 1 | `task-018-gate-orders-client-with-mode-based-auth-shell` | Gate orders-client with mode-based auth shell | none | `apps/orders-client` |
| 2 | `task-019-add-display-mode-auth-and-board-summary-api` | Add display-mode auth and board summary API | none | `apps/production-service`, `apps/users-service` |
| 3 | `task-020-add-staff-client-mode-selection-and-display-session` | Add staff-client mode selection and display session | `task-019-add-display-mode-auth-and-board-summary-api` | `apps/staff-client` |
| 4 | `task-021-redesign-staff-board-into-status-lanes-and-detail-rail` | Redesign staff board into status lanes and detail rail | `task-019-add-display-mode-auth-and-board-summary-api`, `task-020-add-staff-client-mode-selection-and-display-session` | `apps/staff-client` |

## Dependency Notes

- `task-018` is independent because it uses already-existing registered and guest auth endpoints.
- `task-019` must land before the staff display session and the new board summaries can be used safely.
- `task-020` establishes the staff-client mode gate and display-session plumbing without taking on the full board redesign at the same time.
- `task-021` depends on both the new backend summary contract and the mode-aware shell so the lane board can behave differently in interactive and display modes.

## Validation Expectations

- `orders-client` must prove that the landing screen is the only visible surface before auth, that the mode chip appears after auth, and that the footer strip is gone.
- Backend display-mode work must prove that application callers can read the display board, staff-only endpoints remain protected, and board summaries expose per-status item counts.
- `staff-client` must prove that display mode stays read-only, interactive mode still supports detail-and-command workflows, and the lane board groups by derived order status.

## Open Questions

- No blocking decomposition questions remain.
