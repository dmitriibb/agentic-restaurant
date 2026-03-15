# Task Split Report

## Architecture Summary

- Add a Go `production-service` that owns operational order state and consumes RabbitMQ production events.
- Keep `orders-service` as the source of truth for accepted orders, but publish one `production.item.requested.v1` event per quantity unit through an outbox.
- Add a React `staff-client` that uses `production-service` APIs to load the production board and update item states.
- Derive order readiness from production item states instead of editing order status directly.

## Numbering Strategy

- Selected the next standalone task ids `task-011` through `task-016`.
- Kept decomposition explicit through `dependencies`.
- Confirmed that no letter-suffixed child ids were used.

## Generated Tasks

| Order | Task ID | Title | Depends On | Areas |
|---|---|---|---|---|
| 1 | `task-011-bootstrap-production-service-and-rabbitmq` | Bootstrap production-service and RabbitMQ foundation | none | `apps/production-service`, `docker-compose.yml` |
| 2 | `task-012-publish-order-item-events-from-orders-service` | Publish per-item production request events from orders-service | `task-011-bootstrap-production-service-and-rabbitmq` | `apps/orders-service` |
| 3 | `task-013-implement-production-state-store-and-consumers` | Implement production state store and RabbitMQ consumers | `task-011-bootstrap-production-service-and-rabbitmq` | `apps/production-service` |
| 4 | `task-014-add-staff-auth-and-production-command-api` | Add staff auth and production command API | `task-013-implement-production-state-store-and-consumers` | `apps/production-service`, `apps/users-service` |
| 5 | `task-015-build-staff-client-production-board` | Build staff-client production board | `task-014-add-staff-auth-and-production-command-api` | `apps/staff-client` |
| 6 | `task-016-add-cross-service-production-tests-and-docs` | Add cross-service production tests and docs | `task-012-publish-order-item-events-from-orders-service`, `task-013-implement-production-state-store-and-consumers`, `task-014-add-staff-auth-and-production-command-api`, `task-015-build-staff-client-production-board` | `apps/orders-service`, `apps/production-service`, `apps/staff-client`, `docker-compose.yml`, `README.md` |

## Dependency Notes

- `task-011` creates the shared runtime foundation for the new service and broker.
- `task-012` and `task-013` can proceed in parallel once the broker contract and service skeleton exist.
- `task-014` depends on the production state store being present because its APIs mutate real production items.
- `task-015` depends on the production command/query API and staff auth rules.
- `task-016` closes the loop with integration coverage and operational documentation once the core path exists.

## Validation Expectations

- `orders-service` must prove per-item outbox creation and non-breaking synchronous order acceptance.
- `production-service` must prove idempotent event consumption, valid transition handling, and derived order readiness.
- `staff-client` must prove staff login, board rendering, and mutation workflows.
- Cross-service validation should cover at least: order accepted -> RabbitMQ publish -> production items queued -> pickup -> ready -> order ready.

## Open Questions

- No blocking decomposition questions remain.
