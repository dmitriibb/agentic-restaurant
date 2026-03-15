# Implementation Plan: task-013

## 1. Dependencies

Add to go.mod:
- github.com/go-sql-driver/mysql (MySQL driver for database/sql)
- github.com/rabbitmq/amqp091-go (AMQP 0-9-1 client for consuming messages)

## 2. Database Schema

Auto-apply on startup via the Go service. Tables in production_db:

### production_orders
- order_id BIGINT PRIMARY KEY
- external_request_id VARCHAR(64) NOT NULL
- user_id BIGINT NOT NULL
- user_display_name VARCHAR(255) NULL
- status VARCHAR(32) NOT NULL DEFAULT 'QUEUED'
- total_item_count INT NOT NULL DEFAULT 0
- ready_item_count INT NOT NULL DEFAULT 0
- blocked_item_count INT NOT NULL DEFAULT 0
- created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- ready_at TIMESTAMP NULL
- version BIGINT NOT NULL DEFAULT 1
- INDEX idx_status (status)

### production_items
- id CHAR(26) PRIMARY KEY (ULID)
- order_id BIGINT NOT NULL
- line_number INT NOT NULL
- unit_sequence INT NOT NULL
- source_item_key VARCHAR(64) NOT NULL
- menu_item_id BIGINT NOT NULL
- menu_item_name VARCHAR(255) NOT NULL
- station_key VARCHAR(64) NOT NULL DEFAULT 'kitchen'
- status VARCHAR(32) NOT NULL DEFAULT 'QUEUED'
- claimed_by_user_id BIGINT NULL
- claimed_by_display_name VARCHAR(255) NULL
- blocked_reason VARCHAR(255) NULL
- created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- claimed_at TIMESTAMP NULL
- ready_at TIMESTAMP NULL
- version BIGINT NOT NULL DEFAULT 1
- UNIQUE INDEX (order_id, line_number, unit_sequence)
- INDEX (order_id)
- INDEX (status)
- FOREIGN KEY (order_id) REFERENCES production_orders(order_id)

### processed_events
- event_id VARCHAR(64) PRIMARY KEY
- processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

### production_event_outbox
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- event_id VARCHAR(64) NOT NULL
- aggregate_type VARCHAR(64) NOT NULL
- aggregate_id VARCHAR(64) NOT NULL
- routing_key VARCHAR(128) NOT NULL
- payload_json TEXT NOT NULL
- created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- published_at TIMESTAMP NULL
- INDEX (published_at)

## 3. Package Structure

New packages under internal/:

- internal/domain/models.go - ProductionOrder, ProductionItem, ProcessedEvent, OutboxRecord, ItemStatusCounts structs
- internal/domain/status.go - DeriveOrderStatus function with derivation rules
- internal/domain/status_test.go - Unit tests for all derivation cases
- internal/domain/events.go - EventEnvelope, ItemRequestedPayload, outbound payload types
- internal/domain/ulid.go - Simple ULID generator using crypto/rand
- internal/mysql/client.go - Rewrite to use database/sql with go-sql-driver/mysql, return *sql.DB
- internal/mysql/schema.go - RunMigrations function to auto-apply DDL on startup
- internal/store/store.go - Repository with Store struct wrapping *sql.DB
- internal/store/store_test.go - Tests for store operations using mocks
- internal/rabbitmq/consumer.go - AMQP consumer connecting to port 5672
- internal/consumer/handler.go - Message handler: parse, begin tx, check idempotency, persist, derive status, commit
- internal/consumer/handler_test.go - Tests for handler including happy path and duplicate delivery
- internal/outbox/publisher.go - Outbox polling publisher goroutine

Updated files:
- internal/config/config.go - Add MySQLDSN() helper method
- internal/health/handlers.go - No changes needed (Checker interface still works with sql.DB wrapper)
- cmd/production-service/main.go - Wire new components

## 4. Transactional Message Processing Flow

When a production.item.requested.v1 message arrives:

1. Parse JSON envelope and ItemRequestedPayload
2. Begin database transaction
3. INSERT INTO processed_events (event_id) - if duplicate key error, COMMIT and ACK (idempotent skip)
4. INSERT INTO production_orders ... ON DUPLICATE KEY UPDATE total_item_count = total_item_count + 1 (upsert order)
5. Generate ULID for item ID
6. INSERT INTO production_items with source_item_key = fmt.Sprintf("%d-%d-%d", orderId, lineNumber, unitSequence)
   - Use INSERT IGNORE to handle duplicate source_item_key gracefully
7. SELECT status, COUNT(*) FROM production_items WHERE order_id = ? GROUP BY status (get counts)
8. Apply DeriveOrderStatus(counts) to compute new order status
9. UPDATE production_orders SET status = ?, ready_item_count = ?, blocked_item_count = ?, version = version + 1 WHERE order_id = ?
10. INSERT INTO production_event_outbox (outbound item.queued event)
11. COMMIT transaction
12. ACK the AMQP message (only after commit succeeds)
13. On error: ROLLBACK and NACK with requeue

## 5. Order Status Derivation Rules

```
func DeriveOrderStatus(c ItemStatusCounts) string:
  active = c.Queued + c.InProgress + c.Blocked + c.Ready
  if active == 0 && c.Cancelled > 0: return CANCELLED
  if active > 0 && active == c.Ready: return READY
  if c.Blocked > 0: return BLOCKED
  if c.InProgress > 0 || c.Ready > 0: return IN_PROGRESS
  return QUEUED
```

## 6. AMQP Consumer Design

- Connect using amqp091-go to amqp://username:password@host:port/vhost
- Open channel, set QoS prefetch count = 1
- Consume from the configured queue with autoAck=false
- Run in a goroutine started from main.go
- On connection loss, reconnect with exponential backoff
- Pass each delivery to the handler
- ACK after handler returns nil, NACK+requeue on transient error

## 7. Idempotency Strategy

Two layers:
1. processed_events table: PRIMARY KEY on event_id prevents reprocessing same event
2. production_items UNIQUE constraint on (order_id, line_number, unit_sequence) prevents duplicate items even with different event IDs

On duplicate event_id: transaction commits as no-op, message is ACKed
On duplicate source_item_key: INSERT IGNORE skips the row, rest of transaction proceeds

## 8. Outbox Publisher Design

- Poll production_event_outbox WHERE published_at IS NULL ORDER BY id LIMIT 50
- For each record, publish to RabbitMQ exchange via AMQP with the record's routing_key
- On success, UPDATE SET published_at = NOW() WHERE id = ?
- Run in a goroutine with 1-second poll interval
- Graceful shutdown via context cancellation

## 9. MySQL Client Rewrite

Replace TCP-only client with database/sql:
- New() returns (*sql.DB, error)
- DSN: "username:password@tcp(host:port)/database?parseTime=true&timeout=Xs"
- Set connection pool: MaxOpenConns=10, MaxIdleConns=5, ConnMaxLifetime=5m
- The *sql.DB implements a PingContext method; create a thin wrapper to satisfy health.Checker interface

## 10. Test Strategy

### Unit tests (no DB needed):
- internal/domain/status_test.go: Test all 5 derivation outcomes (QUEUED, IN_PROGRESS, BLOCKED, READY, CANCELLED) plus mixed states
- internal/consumer/handler_test.go: Test with mock store interface
  - Happy path: new event creates order + item, derives status
  - Duplicate event: returns nil without creating duplicates

### Integration-style tests (mock DB or interface):
- internal/store/store_test.go: Test store methods against interface contracts

### Existing tests must continue passing:
- internal/config/config_test.go
- internal/health/handlers_test.go  
- internal/rabbitmq/client_test.go
