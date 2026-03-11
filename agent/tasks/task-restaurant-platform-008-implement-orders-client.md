# Task: Implement Orders Client Business Logic

```yaml
id: task-restaurant-platform-008-implement-orders-client
title: Implement user flows in orders-client
status: queued
priority: high
type: feature
architecture: not_requested
retry_count: 0
created_at: 2026-03-11
requested_by: human
areas:
  - apps/orders-client
  - domain-brain
flows:
  - user_authentication
  - menu_browsing
  - order_submission
dependencies:
  - task-restaurant-platform-004-init-orders-client
  - task-restaurant-platform-005-implement-users-service
  - task-restaurant-platform-006-implement-menu-service
  - task-restaurant-platform-007-implement-orders-service
validation:
  - User can log in and token is stored for subsequent requests
  - Authenticated user can load menu items and manage basket quantities
  - User can submit an order and see the returned order id
  - Authorization header is attached to protected API calls
  - Desktop and mobile layouts both remain usable
```

## Summary

Implement the actual user-facing behavior in `orders-client`, including login, token handling, menu browsing, basket management, and order submission.

## Requirements

- Implement login flow against `users-service`.
- Store and reuse the auth token for protected API calls.
- Fetch menu data from `menu-service` after successful login.
- Let the user add items to the basket, change quantities, and remove items.
- Submit orders to `orders-service` and show the returned order id.
- Keep the UI responsive and usable on desktop and mobile.
- Add automated tests for key UI flows where practical.

## Acceptance Criteria

- A user can complete the full flow: login -> load menu -> manage basket -> submit order.
- Every protected request includes the bearer token.
- Basket totals and quantities update correctly in the UI.
- Order confirmation shows the server-returned order id.

## Constraints

- Keep the client aligned with the API-first contracts and generated clients.
- Do not bypass backend validation with client-only assumptions.
- Preserve the feature boundaries defined in the architecture document.

## Context

- Related files: `agent/tasks/task-restaurant-platform-architecture-001.arch.md`
- Related docs: `domain-brain/flows/user-authentication.md`, `domain-brain/flows/menu-browsing.md`, `domain-brain/flows/order-submission.md`
- Related flows: `user_authentication`, `menu_browsing`, `order_submission`
- Risks or dependencies: client behavior depends on stable auth, menu, and order APIs from the backend tasks

## Out of Scope

- Admin UI
- Offline mode
- Push notifications

## Notes for Agents

- Update `domain-brain/` and `flow-index.yaml` if concrete client feature paths or flow details diverge from the architecture documents.
