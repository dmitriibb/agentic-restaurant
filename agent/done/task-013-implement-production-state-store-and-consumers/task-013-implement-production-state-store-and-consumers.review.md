# Code Review: task-013-implement-production-state-store-and-consumers

**Reviewer**: reviewer agent
**Date**: 2026-03-15
**Verdict**: APPROVED

---

## 1. Correctness

### Architecture alignment

The implementation matches the architecture in `task-010-order-production-pipeline-architecture.arch.md`:

- **Tables**: `production_orders`, `production_items`, `processed_events`, `production_event_outbox` all present with the recommended columns.
- **Event envelope**: `EventEnvelope` struct matches the architecture's JSON envelope shape (`eventId`, `eventType`, `occurredAt`, `producer`, `correlationId`, `payload`).
- **Item-level strategy**: Each consumed `production.item.requested.v1` event materializes exactly one `ProductionItem` with a unique `source_item_key` derived from `(orderId, lineNumber, unitSequence)`.
- **Order upsert**: First item creates the order; subsequent items increment `total_item_count` via `ON DUPLICATE KEY UPDATE`.
- **Outbox publishing**: `item.queued` outbox records are written inside the same transaction as the state mutation.

### Task requirements

All four acceptance criteria are satisfied:

1. **Duplicate deliveries**: `processed_events` with `INSERT IGNORE` prevents duplicate processing; `production_items` unique index on `(order_id, line_number, unit_sequence)` with `INSERT IGNORE` prevents duplicate items.
2. **Derived order status**: `DeriveOrderStatus` computes status from `ItemStatusCounts` with correct priority ordering.
3. **Post-commit ack**: The RabbitMQ consumer in `rabbitmq/consumer.go` acks only after `handler` returns nil, and the handler commits the transaction before returning nil.
4. **Test coverage**: Happy path, duplicate event, multiple items same order, and invalid JSON tests all present.

**Result**: Pass - no issues.

---

## 2. Idempotency

Two-layer idempotency is correctly implemented:

- **Layer 1 - Event dedup**: `InsertProcessedEvent` uses `INSERT IGNORE` and checks `RowsAffected`. If the event was already processed, the handler commits the (read-only) transaction and returns nil, causing an ack. This is correct.
- **Layer 2 - Item dedup**: `InsertProductionItem` uses `INSERT IGNORE` against the unique composite index. If the item already exists (e.g., different event ID but same source_item_key), it returns `inserted=false` and the outbox record is skipped.

The duplicate path correctly commits the transaction (not rolls back) so the ack proceeds. This is important because rolling back would leave the processed_events entry absent, causing infinite reprocessing.

**Result**: Pass - no issues.

---

## 3. Transactional Integrity

The single-transaction pattern in `handler.go:HandleMessage` is correct:

1. `BeginTx` opens one transaction.
2. All store operations (`InsertProcessedEvent`, `UpsertProductionOrder`, `InsertProductionItem`, `CountItemsByStatus`, `UpdateOrderStatus`, `InsertOutboxRecord`) use the same `tx`.
3. `Commit()` is called once at the end.
4. `defer tx.Rollback()` with nil-guard ensures cleanup on any error path.
5. After commit, `tx` is set to `nil` to prevent the deferred rollback from acting on a committed transaction.

The pattern of `tx = nil` after commit is a clean Go idiom for this use case.

**Result**: Pass - no issues.

---

## 4. Status Derivation

`DeriveOrderStatus` in `domain/status.go` implements the architecture rules:

| Rule | Architecture spec | Implementation | Match? |
|------|------------------|----------------|--------|
| All active items READY | → READY | `active > 0 && active == c.Ready` | Yes |
| Any active BLOCKED | → BLOCKED | `c.Blocked > 0` (checked after READY) | Yes |
| Any IN_PROGRESS or some READY with others active | → IN_PROGRESS | `c.InProgress > 0 \|\| c.Ready > 0` | Yes |
| All active QUEUED | → QUEUED | fallback return | Yes |
| All items CANCELLED (no active) | → CANCELLED | `active == 0 && c.Cancelled > 0` | Yes |

The `active` variable correctly excludes cancelled items: `active = Queued + InProgress + Blocked + Ready`.

Test coverage: 9 test cases cover all branches including edge cases (zero counts, mixed ready+queued, blocked+ready, ready+cancelled).

**Result**: Pass - no issues.

---

## 5. Schema

Comparing `mysql/schema.go` against architecture section 7.2:

| Architecture column | Schema DDL | Match? |
|---------------------|-----------|--------|
| `order_id BIGINT PRIMARY KEY` | `order_id BIGINT PRIMARY KEY` | Yes |
| `external_request_id VARCHAR(64)` | `external_request_id VARCHAR(64) NOT NULL` | Yes |
| `user_id BIGINT` | `user_id BIGINT NOT NULL` | Yes |
| `user_display_name VARCHAR(255) NULL` | `user_display_name VARCHAR(255) NULL` | Yes |
| `status VARCHAR(32)` | `status VARCHAR(32) NOT NULL DEFAULT 'QUEUED'` | Yes |
| `total_item_count INT` | `total_item_count INT NOT NULL DEFAULT 0` | Yes |
| `ready_item_count INT` | `ready_item_count INT NOT NULL DEFAULT 0` | Yes |
| `blocked_item_count INT` | `blocked_item_count INT NOT NULL DEFAULT 0` | Yes |
| `created_at TIMESTAMP` | Present | Yes |
| `updated_at TIMESTAMP` | Present with ON UPDATE | Yes |
| `ready_at TIMESTAMP NULL` | Present | Yes |
| `version BIGINT` | `version BIGINT NOT NULL DEFAULT 1` | Yes |

Production items table also matches, including ULID `CHAR(26)` primary key, composite unique index on `(order_id, line_number, unit_sequence)`, foreign key, and all nullable staff-related columns.

Idempotency tables (`processed_events`, `production_event_outbox`) match the architecture's recommendations.

**Result**: Pass - no issues.

---

## 6. Code Quality

### Strengths

- Clean package separation: `domain`, `store`, `consumer`, `rabbitmq`, `mysql`, `outbox`.
- `ProductionStore` interface in the consumer package enables testability without database dependencies.
- `TxHandle` interface abstracts `*sql.Tx` for mocking.
- Custom ULID generator avoids external dependency while being thread-safe.
- Error wrapping with `%w` throughout for proper error chain.
- Proper `defer rows.Close()` in query methods.
- RabbitMQ consumer handles reconnection with backoff.
- Graceful shutdown in main with signal handling and context cancellation.

### Non-blocking observations

- **ULID fallback**: `ulid.go:41` - the fallback when `crypto/rand.Read` fails uses timestamp-based entropy. This is fine as a fallback since `crypto/rand` failures are extremely rare, but the comment correctly notes this.
- **Outbox publisher connection pooling**: `outbox/publisher.go` opens a new AMQP connection per poll cycle. This is acceptable for a 1-second interval polling 50 records, but could be optimized later with persistent connections.
- **Store type assertions**: `store.go` uses `tx.(*sql.Tx)` type assertions. These will panic if the wrong type is passed. This is acceptable because production code always passes real `*sql.Tx` through `BeginTx`, and tests use the interface directly. The assertion is a reasonable trade-off vs adding query methods to the `TxHandle` interface.
- **`readyAt` parameter in `UpdateOrderStatus`**: The `readyAt *string` parameter is used only as a nil/non-nil flag to decide whether to set `ready_at = CURRENT_TIMESTAMP`. This works but the parameter type is slightly misleading. Non-blocking.

**Result**: Pass - no blocking issues.

---

## 7. Test Coverage

### Handler tests (`consumer/handler_test.go`) - 4 tests

| Test | What it covers | AC |
|------|---------------|----|
| `TestHandleMessage_HappyPath` | Full flow: order created, item created, status QUEUED, outbox written, event recorded | AC3 (implicit), AC4 |
| `TestHandleMessage_DuplicateEvent` | Same eventID delivered twice; no duplicate items or outbox records | AC1, AC4 |
| `TestHandleMessage_MultipleItemsSameOrder` | Two items for one order; single order with correct counts | AC2 (partial) |
| `TestHandleMessage_InvalidJSON` | Bad message format returns nil (no requeue); nothing created | Robustness |

### Domain status tests (`domain/status_test.go`) - 9 tests

All 5 status derivation rules covered plus edge cases (zero counts, mixed ready+queued, blocked+ready, ready+cancelled). This directly validates AC2.

### Summary

- AC1 (duplicate dedup): Covered by `TestHandleMessage_DuplicateEvent`
- AC2 (derived status): Covered by 9 `DeriveOrderStatus` tests + `TestHandleMessage_MultipleItemsSameOrder`
- AC3 (post-commit ack): Covered architecturally - consumer.go acks only on nil return, handler commits before returning nil. Not directly unit-testable without integration test.
- AC4 (happy + duplicate paths): Both covered.

**Result**: Pass - all acceptance criteria have test coverage.

---

## 8. Domain-Brain Alignment

### Production order entity

All canonical fields from `domain-brain/entities/production-order.md` are present in `domain.ProductionOrder` struct and `production_orders` DDL.

### Production item entity

All canonical fields from `domain-brain/entities/production-item.md` are present in `domain.ProductionItem` struct and `production_items` DDL. The `sourceItemKey` uniqueness constraint on `(orderId, lineNumber, unitSequence)` matches the domain spec.

### Production item lifecycle

Status enum from `domain-brain/state-machines/production-item-lifecycle.md` matches: `QUEUED`, `IN_PROGRESS`, `BLOCKED`, `READY`, `CANCELLED`. The lifecycle transitions are not implemented in this task (that's task-014 for command APIs), which is correct scoping.

**Result**: Pass - no issues.

---

## Issues Summary

### Blocking issues

None.

### Non-blocking observations

1. **Outbox publisher creates a new AMQP connection per poll cycle** (`outbox/publisher.go:65`). Consider connection reuse in a future optimization pass.
2. **`UpdateOrderStatus` takes `readyAt *string` used only as a boolean flag** (`store/store.go:113`). A `bool` parameter would be clearer, but this is functional.
3. **Store type assertions** (`store/store.go:29,45,63,81,114,136`) would panic on wrong type. Acceptable given the interface contract, but could be hardened in the future.
4. **No `OrderStatusOutbound` outbox record written** for the initial order status. The architecture describes `order.ready` events, but for the initial `QUEUED` state this is likely intentional - only item-level outbox is needed when items arrive. Order-level status events will be relevant when items transition to READY (task-014 scope).

---

## Final Verdict

**APPROVED**

The implementation correctly satisfies all four acceptance criteria, aligns with the architecture and domain-brain specifications, uses clean transactional patterns, has proper idempotency protections, and includes adequate test coverage. The non-blocking observations are minor and can be addressed in future tasks.
