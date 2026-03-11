# Task: Implement Menu Service Business Logic

```yaml
id: task-restaurant-platform-006-implement-menu-service
title: Implement menu business logic in menu-service
status: queued
priority: high
type: feature
architecture: not_requested
retry_count: 0
created_at: 2026-03-11
requested_by: human
areas:
  - apps/menu-service
  - domain-brain
flows:
  - menu_browsing
  - order_submission
dependencies:
  - task-restaurant-platform-002-init-menu-service
  - task-restaurant-platform-005-implement-users-service
validation:
  - Public menu endpoint returns stored menu items for authenticated users
  - Internal resolve endpoint returns found and missing item ids correctly
  - Mongo persistence works with long ids
  - Automated tests cover auth enforcement and menu lookups
```

## Summary

Implement the actual menu catalog behavior in `menu-service`, including persistence, authenticated reads, and the internal item resolution endpoint used by `orders-service`.

## Requirements

- Define and generate the OpenAPI contract for public menu reads and internal item resolution.
- Implement Mongo persistence for menu items using long identifiers.
- Seed or otherwise provide initial menu data for development.
- Enforce token validation for protected public endpoints through `users-service`.
- Protect the internal resolve endpoint with service-to-service credentials.
- Add tests for authenticated access, item lookup, and missing item handling.

## Acceptance Criteria

- Authenticated clients can fetch menu items.
- `orders-service` can resolve menu item ids without direct database access.
- Invalid or missing menu ids are surfaced cleanly.
- Menu data matches the documented fields: id, name, description, price.

## Constraints

- Keep `menu-service` as the only owner of menu data.
- Do not implement unrelated admin workflows unless needed for seeded development data.
- Preserve long-id handling instead of switching to Mongo `ObjectId`.

## Context

- Related files: `agent/tasks/task-restaurant-platform-architecture-001.arch.md`
- Related docs: `domain-brain/flows/menu-browsing.md`, `domain-brain/flows/order-submission.md`
- Related flows: `menu_browsing`, `order_submission`
- Risks or dependencies: price representation and long-id generation must remain consistent with current invariants

## Out of Scope

- Full admin menu management UI
- Category/taxonomy features
- Menu versioning

## Notes for Agents

- Update `domain-brain/` and `flow-index.yaml` if concrete application paths or endpoint details diverge from the architecture docs.
