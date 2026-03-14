# Order Production Flow

## Goal

Turn an accepted order into executable kitchen work, track each production item independently, and mark the order `READY` when all active items are ready.

## Steps

1. `orders-service` accepts and persists an order.
2. `orders-service` writes one outbox record per production item unit.
3. An outbox publisher sends `production.item.requested.v1` messages to RabbitMQ.
4. `production-service` consumes each message idempotently and creates production items in `QUEUED` state.
5. `production-service` derives the production order status from the current item states.
6. `staff-client` loads the production board from `production-service`.
7. Staff members mark individual items as picked up (`IN_PROGRESS`), blocked, resumed, or ready.
8. `production-service` publishes item status change events after successful transitions.
9. When all active items are `READY`, `production-service` marks the production order `READY` and publishes `production.order.ready.v1`.

## Status Enums

### Production Item

- `QUEUED`
- `IN_PROGRESS`
- `BLOCKED`
- `READY`
- `CANCELLED`

### Production Order

- `QUEUED`
- `IN_PROGRESS`
- `BLOCKED`
- `READY`
- `CANCELLED`

## Invariants

- Production state is owned only by `production-service`.
- Order intake and financial snapshots remain owned by `orders-service`.
- Production items are tracked per quantity unit, not only per order line.
- Order production status is derived from item statuses and is never manually edited directly.
- Staff mutations must be authenticated and authorized.
- RabbitMQ delivery is treated as at-least-once; consumers must be idempotent.

## Failure Modes

- duplicate `production.item.requested.v1` delivery
- staff attempts an invalid item transition
- two staff members try to pick up the same item at the same time
- RabbitMQ is temporarily unavailable after order acceptance
- `production-service` is unavailable while events are queued
- a blocked item prevents the order from becoming `READY`
