# Task: Implement Orders Service Business Logic

```yaml
id: task-restaurant-platform-007-implement-orders-service
title: Implement order business logic in orders-service
status: done
priority: high
type: feature
architecture: not_requested
retry_count: 0
created_at: 2026-03-11
requested_by: human
areas:
  - apps/orders-service
  - domain-brain
flows:
  - order_submission
dependencies:
  - task-restaurant-platform-003-init-orders-service
  - task-restaurant-platform-005-implement-users-service
  - task-restaurant-platform-006-implement-menu-service
validation:
  - Idempotent `PUT` order creation works with `requestId`
  - Service rejects invalid tokens, mismatched `userId`, empty orders, and invalid quantities
  - Service validates menu item ids through `menu-service`
  - Accepted orders persist to MySQL with order-line snapshots
  - Automated tests cover idempotency, validation, and persistence behavior
```

## Summary

Implement the actual order intake behavior in `orders-service`, including token validation, menu resolution, persistence, and idempotent order creation.

## Requirements

- Define and generate the OpenAPI contract for order submission.
- Add Liquibase schema for orders and order lines.
- Implement idempotent `PUT /orders/{requestId}` behavior.
- Validate the bearer token through `users-service`.
- Verify the request `userId` matches the authenticated token subject.
- Resolve menu item ids through `menu-service`.
- Persist immutable order snapshots and return the created order id.
- Add tests for duplicate submissions, invalid requests, and successful persistence.

## Acceptance Criteria

- Valid requests create orders and return order ids.
- Repeated submissions with the same `requestId` do not create duplicates.
- Unknown menu items or invalid quantities are rejected.
- Order lines persist menu name and price snapshots from submission time.

## Constraints

- Keep `orders-service` as the only owner of order persistence.
- Do not read menu or user databases directly.
- Preserve the `PUT`-based idempotent design from the architecture document.

## Context

- Related files: `agent/tasks/task-restaurant-platform-architecture-001.arch.md`
- Related docs: `domain-brain/flows/order-submission.md`, `domain-brain/state-machines/order-lifecycle.md`
- Related flows: `order_submission`
- Risks or dependencies: business logic depends on working auth validation and menu resolution contracts

## Out of Scope

- Order cancellation
- Payment capture
- Kitchen workflow integration

## Notes for Agents

- Update `domain-brain/` and `flow-index.yaml` if implementation introduces concrete order module paths or refines documented validation rules.
