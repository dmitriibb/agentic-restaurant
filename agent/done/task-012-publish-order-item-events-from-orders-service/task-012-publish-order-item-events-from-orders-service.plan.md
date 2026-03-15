Working as planner agent.

## Scope
Implement task-012 in `apps/orders-service` to generate one outbox row per production item unit for accepted orders and publish those rows to RabbitMQ via retry-safe outbox processing without changing synchronous order acceptance behavior.

## Plan
1. Add persistence/schema support:
- add stable `line_number` to `order_lines`
- add `order_outbox_events` table with event envelope/payload columns and publish metadata
- wire Liquibase changelog include

2. Extend order creation flow:
- enrich `OrderLineSnapshot` with `lineNumber`
- build per-unit `production.item.requested.v1` outbox events after order insert in same transaction
- persist outbox events in `OrderPersistence.createOrder`

3. Implement outbox publisher:
- add RabbitMQ config properties (`exchange`, routing key)
- create scheduled publisher that loads unpublished events in batches, publishes to exchange, marks success timestamp
- keep at-least-once semantics; failures leave rows unpublished for retry

4. Add tests:
- integration test for stable `line_number` values and expected outbox row count based on quantities
- integration test proving duplicate request id does not duplicate orders/outbox rows
- unit/integration test for publisher success/failure behavior if feasible within existing setup

5. Documentation sync:
- update `domain-brain/flows/order-submission.md` and `flow-index.yaml` only if implementation details diverge (currently expected no semantic change)
