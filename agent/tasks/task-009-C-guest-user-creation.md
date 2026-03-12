# Task: Guest User Creation Endpoint

```yaml
id: task-009-C-guest-user-creation
title: Guest user creation endpoint in users-service
status: done
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
  - task-009-B-application-token-pool
validation:
  - POST /api/v1/auth/guests creates a guest user and returns a 24-hour JWT
  - Endpoint requires a valid APPLICATION JWT in Authorization header
  - Non-APPLICATION callers receive 403
  - Missing or blank displayName returns 400
  - Guest login format is guest-{uuid}
  - Guest user has CUSTOMER role and GUEST_USER client_type
  - Guest user has no password_hash
  - Integration tests pass
```

## Summary

Implement the `POST /api/v1/auth/guests` endpoint in users-service that creates a guest user with a display name and issues a 24-hour JWT. The endpoint requires the caller to be an authenticated APPLICATION user (e.g., the orders-client app token).

## Requirements

- New endpoint: `POST /api/v1/auth/guests`
- Authorization: requires a valid JWT in the `Authorization: Bearer` header where the caller's `clientType` is `APPLICATION`. Validate the caller's token through the existing token validation logic.
- Request body: `{ "displayName": "John" }`
- Validation: `displayName` must be non-blank, max 100 characters
- Response 201 Created: `{ "accessToken": "eyJ...", "tokenType": "Bearer", "expiresInSeconds": 86400, "user": { "id": 5001, "login": "guest-a1b2c3d4", "displayName": "John", "clientType": "GUEST_USER" } }`
- Response 401: missing or invalid token
- Response 403: caller is not an APPLICATION user
- Response 400: displayName blank or missing, or exceeds 100 characters
- Guest user creation:
  - `login`: `guest-{uuid}` (UUID without dashes for compactness, or with dashes -- follow architecture doc)
  - `password_hash`: NULL
  - `client_type`: `GUEST_USER`
  - `display_name`: from request
  - `status`: `ACTIVE`
  - `roles`: `["CUSTOMER"]`
  - `application_id`: NULL
  - `last_active_at`: NOW()
- Token issuance: 24-hour lifetime (configurable via `app.security.guest-token-expiration-seconds`, default: 86400)
- JWT claims: `sub` = user id, `login` = guest-{uuid}, `roles` = [CUSTOMER], `clientType` = GUEST_USER, `displayName` = "John"
- Add new DTOs: `CreateGuestRequest`, `CreateGuestResponse`
- Update OpenAPI spec with new endpoint
- Integration tests covering: successful guest creation, invalid token, non-APPLICATION caller, blank displayName, displayName too long

## Acceptance Criteria

- `POST /api/v1/auth/guests` with valid APPLICATION bearer token and valid displayName returns 201 with guest JWT
- Guest JWT has 24-hour lifetime
- Guest user record exists in database with `client_type = GUEST_USER`, no password hash, correct display name
- Guest login is unique (UUID-based)
- Calling without a token returns 401
- Calling with a REGISTERED_USER or GUEST_USER token returns 403
- Blank or missing displayName returns 400
- displayName longer than 100 characters returns 400
- Configuration `app.security.guest-token-expiration-seconds` controls token lifetime

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to users-service only
- Reuse existing `JwtTokenService` for token issuance (extend to support configurable expiration)
- Reuse existing `PasswordHasher` is NOT needed for guests (no password)
- Guest display names have no uniqueness constraint -- multiple guests can share the same name
- All database operations use JDBC (no JPA)
- Add or update tests for behavior changes

## Context

- Architecture design: `agent/tasks/task-009-user-types-and-guest-access.arch.md` (sections 5.2, 8.1, 9.3, 10.2)
- Parent task: `agent/tasks/task-009-user-types-and-guest-access.md`
- Related files:
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/api/AuthController.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/api/AuthDtos.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/application/AuthService.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/security/JwtTokenService.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/persistence/JdbcUserRepository.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/domain/UserAccount.kt`
  - `apps/users-service/api/openapi.yaml`
  - `apps/users-service/src/main/resources/application.yml`
- Related docs: `domain-brain/entities/user-account.md`, `domain-brain/flows/user-authentication.md`
- Related flows: `user_authentication`
- Risks or dependencies: depends on Task A (schema) and Task B (application tokens, since the caller must be an APPLICATION user). The `JwtTokenService` may need modification to support configurable expiration per token type (currently hardcoded to 1 hour).

## Out of Scope

- Guest token refresh (guests do not refresh -- they re-enter their name when the token expires)
- Guest user archival/cleanup (Task D)
- Rate limiting on guest creation
- Changes to orders-client, menu-service, or orders-service

## Notes for Agents

- First visible chat message must identify the current role
- Append audit entries to `agent/tasks/task-009-user-types-and-guest-access.agents-audit.md`
- To validate the caller's APPLICATION token, you need to parse and validate the Bearer token from the Authorization header. You can reuse the existing token validation logic from `AuthService` or `JwtTokenService`. After validation, check that the caller's `clientType` is `APPLICATION`.
- The `JwtTokenService` currently issues tokens with a fixed 1-hour lifetime. You need to make the expiration configurable (pass it as a parameter to the token generation method) so guest tokens can have a 24-hour lifetime.
- Add the new config property `app.security.guest-token-expiration-seconds` to `application.yml` with default 86400.
- The guest JWT should include `displayName` as a claim (in addition to the standard claims). This is specific to GUEST_USER tokens. The broader claim changes for all token types come in Task D.
