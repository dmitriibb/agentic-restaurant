# Implementation Plan

## Task Summary
- Implement authentication business behavior in `users-service`: login/password verification, JWT issuance, and internal token validation endpoint.
- Seed five predefined users via Liquibase and add automated tests for login + validation scenarios.

## Architecture Input
- `not requested`
- Uses `agent/tasks/task-restaurant-platform-architecture-001.arch.md` plus `domain-brain/invariants.md` and `domain-brain/flows/user-authentication.md`.

## Affected Areas
- `apps/users-service`
- `domain-brain` (only if implementation diverges from current invariants)
- `agent/tasks/task-restaurant-platform-005-implement-users-service.md`

## Steps
1. Extend users-service dependencies/config for JWT signing and security properties.
2. Add persistence/repository layer for user lookups.
3. Implement password-hash verification and login service flow.
4. Implement JWT issuance with one-hour expiry and internal token validation flow.
5. Enforce internal service credential on validation endpoint.
6. Update OpenAPI contract to match implemented endpoint behavior.
7. Add Liquibase seed changelog for five predefined users.
8. Add integration tests for valid login, invalid login, validation success, expired token, and missing service token.
9. Run compose + Maven validation and produce task artifacts.

## Tests
- `docker compose up -d --wait users-db`
- `mvn test`
- `mvn -DskipTests package`

## Domain Documentation Updates
- Expected: no invariant changes; update only if implementation diverges.
- `flow-index.yaml` expected unchanged; path mapping is already correct.

## Open Questions
- none
