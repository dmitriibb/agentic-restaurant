# Implementation Plan

## Task Summary
- Add a dedicated display-mode application authentication path so `staff-client` can load a passwordless but authorized board view.
- Extend `production-service` board summary contracts with per-status item counts and add a display-safe read-only summary endpoint.
- Keep production mutations and order-detail behaviors restricted to interactive staff roles.

## Architecture Input
- `source_architecture`: `task-017-redesign-ui-entry-modes-and-production-board`
- Reference: `agent/done/task-017-redesign-ui-entry-modes-and-production-board/task-017-redesign-ui-entry-modes-and-production-board.arch.md`

## Affected Areas
- `apps/users-service` (application credential seed/config and auth tests)
- `apps/production-service` (board summary DTOs, query/projection, display endpoint, auth guards, tests)
- `domain-brain/flows/user-authentication.md`
- `domain-brain/flows/order-production.md`

## Steps
1. Inspect current `users-service` application-token provisioning path and identify where bootstrap/seed application credentials are defined for non-human clients.
2. Add a dedicated display application identity/credential for `staff-client` display mode in `users-service` bootstrap configuration (or equivalent initializer) without altering existing staff interactive login behavior.
3. Add or update `users-service` tests to verify the new display application credential can obtain an `APPLICATION` token and does not affect registered-user login constraints.
4. Inspect `production-service` board summary model and mapping pipeline used by `GET /api/v1/production/orders`.
5. Extend the interactive summary response contract to include `itemStatusCounts` for `QUEUED`, `IN_PROGRESS`, `BLOCKED`, and `READY` plus a consistent total count field when needed by the board.
6. Implement aggregation logic in `production-service` so each order summary computes per-status item counts from owned production items while keeping order column assignment based on derived order status.
7. Add a new read-only display-board endpoint in `production-service` (for example `GET /api/v1/production/display/orders`) that returns only display-safe summary fields and omits customer name, blocked-reason internals, and mutation affordances.
8. Enforce authorization boundaries in `production-service` so display endpoint accepts `APPLICATION` callers only, while interactive board/detail and mutation endpoints remain restricted to `STAFF`/`MANAGER`/`ADMIN`.
9. Add or update `production-service` tests for: summary counts contract, display projection field restrictions, `APPLICATION` access to display endpoint, and rejection of `APPLICATION` access to mutation endpoints.
10. Update `domain-brain` flow docs to reflect implemented backend behavior for display application auth and display-board projection restrictions.
11. Confirm `flow-index.yaml` mappings remain accurate for `user_authentication` and `order_production`; update only if actual ownership/path mappings changed during implementation.

## Tests
- In `apps/production-service`: `go test ./...`
- In `apps/users-service`: `mvn test`
- Add/adjust endpoint-level authorization tests validating:
  - display endpoint allows `APPLICATION` tokens
  - interactive detail/mutation endpoints reject `APPLICATION` tokens
  - staff-role tokens continue to access interactive endpoints
- Add/adjust contract tests validating per-order `itemStatusCounts` in board summaries.

## Domain Documentation Updates
- Update `domain-brain/flows/user-authentication.md` with implemented staff display application credential behavior in `users-service`.
- Update `domain-brain/flows/order-production.md` with implemented display summary projection and per-status item count contract details.
- `flow-index.yaml`: no change expected unless implementation introduces new persisted mapping paths that should be indexed.

## Open Questions
- Should the display endpoint payload include `createdAt`/`updatedAt` timestamps for board ordering, or should ordering be fully server-side with minimal timestamp exposure?
- What is the canonical configuration source for seeded application credentials in `users-service` for this repository (SQL seed, application bootstrap runner, or migration script), so coder changes stay consistent with existing initialization patterns?
