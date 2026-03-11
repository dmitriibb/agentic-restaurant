# Coder Report

## Implemented Changes
- Replaced orders OpenAPI placeholder with a concrete authenticated/idempotent contract for `PUT /api/v1/orders/{requestId}`.
- Added request/response DTOs and `OrdersController` handling bearer extraction plus status mapping (`401`, `403`, `400`, `200`).
- Implemented `OrderSubmissionService` with:
  - token validation through `users-service` client
  - request `userId` and token subject matching
  - empty/quantity/menu validation
  - idempotency check by `(userId, requestId)`
  - snapshot pricing/line totals and accepted-order persistence
  - duplicate key race fallback for idempotent retries
- Added outbound clients:
  - `AuthValidationClient` for `/api/v1/internal/auth/validate`
  - `MenuLookupClient` for `/api/v1/internal/menu-items/resolve`
- Added JDBC persistence layer (`OrderPersistence`) for order lookup and transactional create with line inserts.
- Added downstream configuration in `application.yml`, `application-local.yml`, and `application-integration.yml`.
- Updated orders-service README with implemented behavior.

## Tests Added or Updated
- Reworked `OrdersServiceApplicationTests` to cover:
  - successful order creation and snapshot persistence
  - idempotent duplicate submission behavior
  - missing auth and invalid token rejection
  - userId mismatch rejection
  - empty order and invalid quantity validation
  - unknown menu item rejection
  - existing schema/readiness checks

## Domain Documentation Updates
- none required; implementation adheres to current invariants:
  - orders ownership remains in `orders-service`
  - no direct DB access to users/menu services
  - idempotency by `(userId, requestId)`
  - line snapshots store menu name and unit price

## Assumptions
- Mismatched request `userId` is treated as `403 Forbidden`.
- Downstream dependency errors fail closed and result in rejection behavior.

## Known Limitations
- Downstream calls use synchronous `RestTemplate` and untyped `Map` parsing for now.
- No separate retry/backoff policy for dependency outages in this iteration.
