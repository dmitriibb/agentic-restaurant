# Coder Report

## Implemented Changes
- Added split authorization middleware wiring in production-service so interactive endpoints require staff roles and the new display summary endpoint requires `APPLICATION` client type.
- Added `GET /api/v1/production/display/orders` in production-service, returning a display-safe projection without customer name fields.
- Extended interactive board summary payload from `GET /api/v1/production/orders` to include per-order `ItemStatusCounts` (`Queued`, `InProgress`, `Blocked`, `Ready`) and `TotalItemCount` computed from active item statuses.
- Added users-service Liquibase change `008-seed-staff-client-display-app.yaml` and included it in master changelog to seed a dedicated `staff-client-display` application credential.
- Updated users-service integration tests to reflect the new seeded application count and to verify `staff-client-display` can acquire an application token.

## Tests Added or Updated
- Updated `apps/production-service/internal/api/handlers_test.go`:
  - summary payload contains `ItemStatusCounts`
  - display summary omits `UserDisplayName`
  - `APPLICATION` token can call display endpoint
  - `APPLICATION` token is forbidden on mutation endpoint
- Updated `apps/production-service/internal/auth/middleware_test.go`:
  - `RequireApplicationClient` allows `APPLICATION` caller
  - `RequireApplicationClient` rejects non-application caller
- Updated `apps/users-service/src/test/kotlin/com/agentic/restaurant/users/UsersServiceApplicationTests.kt`:
  - seeded applications count expectations
  - seeded application names expectations
  - token acquisition test for `staff-client-display`

## Domain Documentation Updates
- Updated `domain-brain/flows/user-authentication.md` with dedicated `staff-client-display` credential and display endpoint authorization details.
- Updated `domain-brain/flows/order-production.md` with explicit interactive/display endpoint usage and per-order status-count summary contract.
- `flow-index.yaml` not changed because service ownership/path mapping remained the same.

## Assumptions
- The seeded secret for display mode is `staff-client-display-secret` and will be supplied by callers when requesting application tokens.
- The board total item count in summary should represent active status totals (`QUEUED`, `IN_PROGRESS`, `BLOCKED`, `READY`) as required by the display/interactive board contract.

## Known Limitations
- `apps/users-service` integration tests require a reachable local MySQL instance; `mvn test` fails in this environment due to DB connection refusal, so users-service test verification is environment-blocked.
