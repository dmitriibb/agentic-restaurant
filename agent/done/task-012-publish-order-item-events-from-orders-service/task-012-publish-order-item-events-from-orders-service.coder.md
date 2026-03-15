Working as coder agent.

## Implemented Changes
- Added Liquibase migration `003-add-production-item-outbox.yaml` to:
  - add `line_number` column + `(order_id, line_number)` uniqueness on `order_lines`
  - add `order_outbox_events` table for durable production-item event publishing
- Extended `OrderLineSnapshot` with stable `lineNumber`.
- Updated `OrderSubmissionService` to:
  - assign deterministic `lineNumber` by request order
  - build one `production.item.requested.v1` outbox event per quantity unit
  - persist outbox rows after accepted order creation in the same transaction.
- Added event envelope/payload builder in `ProductionItemRequestedEvents.kt`.
- Added `OrderOutboxPublisher` scheduled component to publish unpublished events to RabbitMQ exchange and mark successful publishes.
- Added RabbitMQ/outbox configuration in `application.yml` and `application-local.yml`.
- Added `spring-boot-starter-amqp` dependency.
- Enabled scheduling in `OrdersServiceApplication`.
- Updated integration tests to cover:
  - outbox table existence
  - line number persistence
  - per-unit outbox row count
  - duplicate request id not duplicating outbox rows.
- Added unit tests for outbox publisher success/failure behavior.
