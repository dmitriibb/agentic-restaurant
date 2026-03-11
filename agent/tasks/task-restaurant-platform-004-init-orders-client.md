# Task: Init Orders Client

```yaml
id: task-restaurant-platform-004-init-orders-client
title: Initialize orders-client and verify local startup
status: queued
priority: medium
type: bootstrap
architecture: not_requested
retry_count: 0
created_at: 2026-03-11
requested_by: human
areas:
  - apps/orders-client
flows:
  - user_authentication
  - menu_browsing
  - order_submission
dependencies:
  - task-restaurant-platform-001-init-users-service
  - task-restaurant-platform-002-init-menu-service
  - task-restaurant-platform-003-init-orders-service
validation:
  - `orders-client` starts locally in development mode
  - Environment configuration exists for backend base URLs
  - The app renders a basic shell in desktop and mobile layouts
```

## Summary

Bootstrap `orders-client` as a runnable React application prepared for later login, menu, basket, and order submission features.

## Requirements

- Create the `apps/orders-client` project skeleton in React.
- Configure local development startup and environment-based backend URLs.
- Establish the base routing, layout, and responsive shell needed for later features.
- Prepare the project for generated API clients and shared request configuration.

## Acceptance Criteria

- The client can start locally in development mode.
- Basic application shell renders successfully.
- Desktop and mobile viewports do not break the initial layout.
- No business workflows are required yet.

## Constraints

- Keep this task focused on bootstrap and local startup.
- Do not implement login, menu display, basket, or order submission behavior in this task.
- Keep the client structure aligned with the architecture document feature boundaries.

## Context

- Related files: `agent/tasks/task-restaurant-platform-architecture-001.arch.md`
- Related docs: `domain-brain/flows/user-authentication.md`, `domain-brain/flows/menu-browsing.md`, `domain-brain/flows/order-submission.md`
- Related flows: `user_authentication`, `menu_browsing`, `order_submission`
- Risks or dependencies: backend URLs and auth conventions should remain compatible with later service tasks

## Out of Scope

- Login form behavior
- API integration
- Basket state management

## Notes for Agents

- Keep the shell visually intentional and responsive so later business logic tasks can build on it directly.
