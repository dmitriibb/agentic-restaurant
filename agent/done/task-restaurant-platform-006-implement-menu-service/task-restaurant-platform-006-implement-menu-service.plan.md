# Implementation Plan

## Task Summary
- Implement menu business behavior in `menu-service`: authenticated menu reads, internal item-id resolution, Mongo persistence with long ids, and seeded development data.

## Architecture Input
- `not requested`
- Uses `agent/tasks/task-restaurant-platform-architecture-001.arch.md` and domain flow docs:
  - `domain-brain/flows/menu-browsing.md`
  - `domain-brain/flows/order-submission.md`
  - `domain-brain/invariants.md`

## Affected Areas
- `apps/menu-service`
- `agent/tasks/task-restaurant-platform-006-implement-menu-service.md`

## Steps
1. Add Mongo persistence model/repository for long-id menu items with decimal-safe stored prices.
2. Add seeded menu data initializer for development bootstrap.
3. Implement public menu endpoint guarded by token validation against `users-service`.
4. Implement internal resolve endpoint guarded by service-to-service credential.
5. Add auth validation client for calling `users-service` internal token validation endpoint.
6. Update OpenAPI contract and runtime configuration for auth/service-token settings.
7. Add integration tests covering auth enforcement, lookup behavior, and readiness/Mongo checks.
8. Run compose + Maven validation and produce task artifacts.

## Tests
- `docker compose up -d --wait mongo`
- `mvn test`
- `mvn -DskipTests package`

## Domain Documentation Updates
- Expected none; current invariants already cover menu ownership, long ids, and auth rejection behavior.
- Update `domain-brain`/`flow-index.yaml` only if implementation diverges.

## Open Questions
- none
