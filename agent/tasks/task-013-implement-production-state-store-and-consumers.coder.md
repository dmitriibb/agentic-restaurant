# task-013: Coder Notes

## Summary

Introduced testable interface abstractions and wrote unit tests for the production-service event handler.

## Changes

### 1. `internal/domain/models.go`

- Added `TxHandle` interface with `Commit()` and `Rollback()` methods. This lives in `domain` to avoid circular imports between `consumer` and `store`.

### 2. `internal/store/store.go`

- Changed `BeginTx` return type from `(*sql.Tx, error)` to `(domain.TxHandle, error)`.
- Changed all transactional methods (`InsertProcessedEvent`, `UpsertProductionOrder`, `InsertProductionItem`, `CountItemsByStatus`, `UpdateOrderStatus`, `InsertOutboxRecord`) to accept `domain.TxHandle` instead of `*sql.Tx`.
- Each method type-asserts `tx.(*sql.Tx)` internally to access the concrete SQL operations.
- Non-transactional methods (`FetchUnpublishedOutbox`, `MarkOutboxPublished`) remain unchanged since they use `s.db` directly.

### 3. `internal/consumer/handler.go`

- Defined `ProductionStore` interface covering the 7 store methods the handler calls.
- Changed `Handler.store` field from `*store.Store` to `ProductionStore`.
- Changed `New()` constructor to accept `ProductionStore` instead of `*store.Store`.
- Updated `writeItemQueuedOutbox` to accept `domain.TxHandle` instead of `*sql.Tx`.
- Removed `"database/sql"` and `"agentic/restaurant/production-service/internal/store"` imports.

### 4. `internal/consumer/handler_test.go` (new file)

- `mockTx`: implements `domain.TxHandle` tracking commit/rollback calls.
- `mockStore`: implements `ProductionStore` with in-memory maps and slices.
- `makeEventBody`: helper that constructs a valid `EventEnvelope` JSON body.
- **4 tests**:
  - `TestHandleMessage_HappyPath` -- full flow: idempotency insert, order upsert, item insert, status derivation, outbox write, commit.
  - `TestHandleMessage_DuplicateEvent` -- verifies idempotent duplicate skips processing.
  - `TestHandleMessage_MultipleItemsSameOrder` -- two items on one order, both processed correctly.
  - `TestHandleMessage_InvalidJSON` -- malformed body returns nil (no requeue), nothing persisted.

### 5. `cmd/production-service/main.go`

- No changes needed. `*store.Store` satisfies the `ProductionStore` interface implicitly.

## Verification

- `go build ./...` -- passes
- `go test ./...` -- all tests pass (4 new tests in `internal/consumer`)
