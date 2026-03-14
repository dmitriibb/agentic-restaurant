# Task: User Types, Guest Access, and Application Authentication

```yaml
id: task-009-user-types-and-guest-access
title: User types, guest access, and application authentication
status: done
priority: high
type: feature
architecture: requested
retry_count: 0
created_at: 2026-03-12
requested_by: human
areas:
  - apps/users-service
  - apps/orders-client
  - apps/menu-service
  - apps/orders-service
flows:
  - user_authentication
  - menu_browsing
  - order_submission
dependencies: []
validation:
  - users-service builds and starts successfully
  - orders-client builds and starts successfully
  - menu-service builds and starts successfully
  - orders-service builds and starts successfully
  - registered user login still works end-to-end
  - guest user can be created via orders-client and browse menu and submit orders
  - application services authenticate via JWT on startup
  - docker compose up brings the full stack with new auth flows working
```

## Summary

Extend the users-service to support three distinct client types: RegisteredUser (existing login/password flow), GuestUser (instant creation with display name only, for restaurant terminals), and Application (machine-to-machine auth for backend services). Replace the current static `X-Service-Token` mechanism with proper JWT-based application authentication. Enable orders-client to offer both registered login and guest login on its home screen.

## Requirements

- Add `client_type` enum to the user model: `REGISTERED_USER`, `GUEST_USER`, `APPLICATION`
- Add `display_name` column to the users table
- Add `last_active_at` tracking to the users table
- GuestUser: created on demand with a display name, receives a 24-hour JWT (configurable), no password required
- Guest users archived (disabled) after 7 days (configurable via `app.security.guest-retention-days`)
- Application: pool-based token management with configurable max pool size (default 30), lazy user creation, inactive instance reclamation
- orders-client registers as an Application and acquires a JWT on startup; auto-refreshes before expiry
- orders-client home screen offers both "Login" (registered) and "Continue as Guest" (guest) options
- menu-service and orders-service register as Application users and acquire JWTs on startup
- Replace `X-Service-Token` header mechanism with JWT-based service-to-service auth (except for the validate endpoint which keeps X-Service-Token)
- Track `created_at`, `last_active_at` for all user types
- Orders store and display guest user id and display name
- Remove demo customer/manager seed users; keep only admin/admin
- Application secrets managed via environment variables
- Existing registered user login flow must continue to work unchanged

## Acceptance Criteria

- `POST /api/v1/auth/login` still works for registered users (admin/admin)
- New `POST /api/v1/auth/guests` endpoint creates a guest user and returns a 24-hour JWT
- New `POST /api/v1/auth/applications/token` endpoint issues JWT from the application pool
- Guest users can browse menu and submit orders through orders-client
- Order confirmation shows user id and display name
- Backend services authenticate with JWT instead of static tokens
- Application token pool respects max size limit and reclaims inactive slots
- Token validation endpoint returns `client_type` and `display_name` in the response
- Guest users are archived (disabled) after 7 days by a scheduled job
- Demo customer/manager users are removed; only admin user remains in seeds
- All existing integration tests still pass (updated for seed data changes)
- New behavior is covered by tests

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to the task
- Update domain knowledge files when concrete business logic changes
- Add or update tests for behavior changes
- Existing Java/Kotlin conventions preserved (Spring Boot, JDBC, Liquibase)
- orders-client remains a React SPA with the same feature-sliced structure

## Context

- Related files: all files in apps/users-service, apps/orders-client, apps/menu-service, apps/orders-service
- Related docs: domain-brain/flows/user-authentication.md, domain-brain/entities/user-account.md, domain-brain/entities/access-token.md, domain-brain/invariants.md
- Related flows: user_authentication, menu_browsing, order_submission
- Risks or dependencies: database migration on existing users table; demo user removal requires test updates; orders-service schema change for user_display_name

## Out of Scope

- Admin UI for managing users or applications
- Rate limiting on guest creation
- Application secret rotation mechanism
- OAuth2 / OpenID Connect implementation
- Role-based access control changes beyond what exists
- Multi-tenant support

## Sub-Tasks

This task is split into 7 sequential implementation sub-tasks. Execute in order (each depends on preceding tasks):

| Order | Task ID | Title | Areas | Dependencies |
|---|---|---|---|---|
| A | `task-009-A-database-schema-changes` | Database schema changes for user types and applications | users-service | none |
| B | `task-009-B-application-token-pool` | Application token pool endpoint | users-service | A |
| C | `task-009-C-guest-user-creation` | Guest user creation endpoint | users-service | A, B |
| D | `task-009-D-token-claim-validation-changes` | Token claims, validation response, and guest archival | users-service | A, B, C |
| E | `task-009-E-backend-service-startup-auth` | Backend service startup auth and inter-service JWT | menu-service, orders-service | B, D |
| F | `task-009-F-orders-client-guest-login` | orders-client guest login flow and app token management | orders-client | B, C, E |
| G | `task-009-G-domain-documentation-updates` | Domain documentation updates for user types | domain-brain | A-F |

Task files: `agent/tasks/task-009-{A..G}-*.md`

## Notes for Agents

- First visible chat message must identify the current role
- Append audit entries to `agent/tasks/task-009-user-types-and-guest-access.agents-audit.md`
- This task has been split into 7 sub-tasks (A through G). Execute them sequentially, one by one.
- The architecture document provides the full design: `agent/tasks/task-009-user-types-and-guest-access.arch.md`
- Each sub-task has its own detailed requirements, acceptance criteria, and context. Read the sub-task file before starting work.
