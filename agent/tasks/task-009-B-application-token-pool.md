# Task: Application Token Pool

```yaml
id: task-009-B-application-token-pool
title: Application token pool endpoint in users-service
status: queued
priority: high
type: feature
architecture: not_requested
retry_count: 0
created_at: 2026-03-12
requested_by: human
parent_task: task-009-user-types-and-guest-access
areas:
  - apps/users-service
flows:
  - user_authentication
dependencies:
  - task-009-A-database-schema-changes
validation:
  - POST /api/v1/auth/applications/token returns a valid JWT for correct credentials
  - Pool user is created lazily with login format app-{applicationName}-{sequenceNumber}
  - Concurrent token requests do not cause duplicate pool user assignment (FOR UPDATE locking)
  - Pool exhaustion returns 503 Service Unavailable
  - Inactive pool users are reclaimed after threshold
  - Invalid credentials return 401
  - Disabled application returns 403
  - Integration tests pass
```

## Summary

Implement the `POST /api/v1/auth/applications/token` endpoint in users-service that authenticates applications by name + secret and issues JWTs from a pool of lazily-created APPLICATION users with `SELECT ... FOR UPDATE` concurrency control.

## Requirements

- New endpoint: `POST /api/v1/auth/applications/token` (no prior authentication required)
- Request body: `{ "applicationName": "menu-service", "applicationSecret": "menu-service-secret" }`
- Response 200: `{ "accessToken": "eyJ...", "tokenType": "Bearer", "expiresInSeconds": 3600, "user": { "id": 9001, "login": "app-menu-service-1", "clientType": "APPLICATION" } }`
- Response 401: application not found or secret incorrect
- Response 403: application is DISABLED
- Response 503: all pool slots occupied by active instances
- Pool acquisition algorithm:
  1. Look up application by `application_name`, verify `secret_hash` using `PasswordHasher`, check status is `ACTIVE`
  2. `SELECT * FROM users WHERE application_id = ? AND client_type = 'APPLICATION' AND (last_active_at IS NULL OR last_active_at < NOW() - INTERVAL ? MINUTE) ORDER BY last_active_at ASC NULLS FIRST LIMIT 1 FOR UPDATE`
  3. If found: update `last_active_at = NOW()`, `status = ACTIVE`, issue 1-hour JWT
  4. If not found: check current pool count. If count < `max_pool_size`, create new pool user with `login = app-{applicationName}-{sequenceNumber}`, `client_type = APPLICATION`, `role = SERVICE`, issue JWT. If count >= `max_pool_size`, return 503.
- Pool users have: `client_type = APPLICATION`, `role = SERVICE`, `application_id` set, `password_hash = NULL`
- Inactivity threshold configurable via `app.security.application-inactive-threshold-minutes` (default: 10)
- Add new DTOs: `ApplicationTokenRequest`, `ApplicationTokenResponse`
- Update OpenAPI spec with new endpoint
- Integration tests covering: successful acquisition, pool user reuse, lazy creation, pool exhaustion, inactive reclamation, invalid credentials, disabled application

## Acceptance Criteria

- Application with valid name + secret receives a JWT and pool user assignment
- Pool users are created lazily only when no inactive pool user is available
- Pool user login follows format `app-{applicationName}-{sequenceNumber}` (e.g., `app-menu-service-1`)
- `last_active_at` is updated on acquisition
- Concurrent acquisitions for the same application do not assign the same pool user (verified by integration test)
- When all pool users are active and pool is at max size, 503 is returned
- Inactive pool users (older than threshold) are reclaimed and reassigned
- Invalid application name or wrong secret returns 401
- Disabled application returns 403
- JWT contains `sub`, `login`, `roles: [SERVICE]`, `clientType: APPLICATION`

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to users-service only
- Pool acquisition must run within a single database transaction using `FOR UPDATE` locking
- Use existing `PasswordHasher` to verify application secrets
- Use existing `JwtTokenService` for token issuance (1-hour lifetime, same as registered users)
- All database operations use JDBC (no JPA)
- Add or update tests for behavior changes

## Context

- Architecture design: `agent/tasks/task-009-user-types-and-guest-access.arch.md` (sections 5.3, 5.4, 8.2, 9.2, 9.6, 10.3, 10.4)
- Parent task: `agent/tasks/task-009-user-types-and-guest-access.md`
- Related files:
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/api/AuthController.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/api/AuthDtos.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/application/AuthService.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/security/JwtTokenService.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/security/PasswordHasher.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/persistence/JdbcUserRepository.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/persistence/UserRepository.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/domain/UserAccount.kt` (updated in Task A with `ClientType` enum)
  - `apps/users-service/api/openapi.yaml`
  - `apps/users-service/src/main/resources/application.yml`
- Related docs: `domain-brain/entities/user-account.md`, `domain-brain/flows/user-authentication.md`
- Related flows: `user_authentication`
- Risks or dependencies: depends on Task A being complete (schema, entities, repositories). The `FOR UPDATE` locking requires careful transaction management in JDBC.

## Out of Scope

- Guest user creation (Task C)
- JWT claim changes for clientType (Task D will add clientType to all tokens; this task can include it for APPLICATION tokens specifically since it's creating them here)
- Backend service startup auth (Task E)
- Changes to menu-service, orders-service, or orders-client

## Notes for Agents

- First visible chat message must identify the current role
- Append audit entries to `agent/tasks/task-009-user-types-and-guest-access.agents-audit.md`
- The pool acquisition logic is the most complex part. Make sure the `SELECT ... FOR UPDATE` query runs within a `@Transactional` block (or explicit JDBC transaction). Test concurrent access with multiple threads in an integration test.
- The new `UserRepository` methods needed: `findAvailablePoolUser(applicationId, inactiveThresholdMinutes)`, `countByApplicationId(applicationId)`, `updateLastActiveAt(userId)`. These should have been partially set up by Task A; if not, create them here.
- The JWT issued here should already include `clientType: APPLICATION` in its claims, even though the broader claim changes are in Task D. This endpoint creates APPLICATION tokens specifically.
- The `expiresInSeconds` field in the response should be calculated from the configured token lifetime (same 1-hour default as registered users).
- Add the new config property `app.security.application-inactive-threshold-minutes` to `application.yml`.
