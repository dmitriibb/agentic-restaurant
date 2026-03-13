# Task: Token Claim and Validation Changes

```yaml
id: task-009-D-token-claim-validation-changes
title: Token claims, validation response, and guest archival
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
  - task-009-C-guest-user-creation
validation:
  - All new JWTs include clientType claim
  - ValidateTokenResponse includes clientType and displayName
  - Login response UserSummary includes clientType and displayName
  - Login rejects non-REGISTERED_USER accounts
  - Login updates last_active_at
  - Tokens without clientType claim are treated as REGISTERED_USER
  - Scheduled guest archival job disables guests older than retention period
  - Integration tests pass
```

## Summary

Extend JWT claims to include `clientType` (and `displayName` for guests) on all tokens. Update the token validation endpoint response to include `clientType` and `displayName`. Update the login endpoint to reject non-registered users and update `last_active_at`. Implement a scheduled job to archive (disable) guest users older than the configurable retention period.

## Requirements

### JWT Claim Changes
- Add `clientType` claim to ALL newly issued JWTs (registered, guest, application)
- For guest users, also include `displayName` claim
- Token issuance in `JwtTokenService` must accept `clientType` and optional `displayName` parameters
- Handle backward compatibility: tokens without `clientType` claim should be treated as `REGISTERED_USER` during validation

### Validate Token Endpoint Changes
- Extend `POST /api/v1/internal/auth/validate` response to include `clientType` and `displayName` fields:
  ```json
  {
    "valid": true,
    "userId": 1001,
    "login": "alex.customer",
    "roles": ["CUSTOMER"],
    "clientType": "REGISTERED_USER",
    "displayName": "Alex",
    "expiresAt": "2026-03-12T11:00:00Z"
  }
  ```
- `displayName` comes from the JWT claim (for guests) or from the `display_name` database column (for registered/application users)
- `clientType` comes from the JWT claim, defaulting to `REGISTERED_USER` if absent

### Login Endpoint Changes
- Extend `LoginResponse` UserSummary to include `displayName` and `clientType`
- Login must reject attempts to log in as non-`REGISTERED_USER` accounts (guest users and application users cannot use the login endpoint). Return 401 with appropriate error message.
- Update `last_active_at` on successful login

### Guest User Archival
- Implement a scheduled job (using `@Scheduled` with daily cron) that sets `status = DISABLED` on guest users where `created_at` is older than `app.security.guest-retention-days` (default: 7)
- Only target users with `client_type = GUEST_USER` and `status = ACTIVE`
- Log the number of archived guest users

### Configuration
- Add `app.security.guest-retention-days` to `application.yml` (default: 7)

### OpenAPI and Tests
- Update OpenAPI spec with extended response schemas
- Update existing integration tests for modified responses
- Add integration tests for: backward-compatible token validation, login rejection of non-registered users, guest archival job

## Acceptance Criteria

- JWTs issued by the login endpoint include `clientType: REGISTERED_USER`
- JWTs issued by the guest creation endpoint include `clientType: GUEST_USER` and `displayName`
- JWTs issued by the application token endpoint include `clientType: APPLICATION`
- Token validation response includes `clientType` and `displayName` for all token types
- Old tokens (without `clientType`) validate successfully and return `clientType: REGISTERED_USER`
- Login endpoint returns `clientType` and `displayName` in the user summary
- Login endpoint rejects guest and application user logins with 401
- `last_active_at` is updated on successful registered user login
- Scheduled job archives guest users older than retention period
- Scheduled job runs daily and logs results
- All integration tests pass

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to users-service only
- Backward compatibility: old tokens must still validate correctly
- The scheduled job must not affect registered or application users
- All database operations use JDBC (no JPA)
- Add or update tests for behavior changes

## Context

- Architecture design: `agent/tasks/task-009-user-types-and-guest-access.arch.md` (sections 5.8, 8.3, 8.4, 9.3, 10.5, 12.1 Task D)
- Parent task: `agent/tasks/task-009-user-types-and-guest-access.md`
- Related files:
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/security/JwtTokenService.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/application/AuthService.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/api/AuthController.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/api/AuthDtos.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/persistence/JdbcUserRepository.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/domain/UserAccount.kt`
  - `apps/users-service/api/openapi.yaml`
  - `apps/users-service/src/main/resources/application.yml`
  - `apps/users-service/src/test/kotlin/com/agentic/restaurant/users/UsersServiceApplicationTests.kt`
- Related docs: `domain-brain/entities/access-token.md`, `domain-brain/flows/user-authentication.md`
- Related flows: `user_authentication`
- Risks or dependencies: depends on Tasks A, B, C being complete. Backward compatibility for tokens without `clientType` claim is critical during rollout -- must be tested explicitly.

## Out of Scope

- Changes to downstream services (menu-service, orders-service consume the extended validation response in Task E)
- Changes to orders-client (Task F)
- Token lifetime changes for registered users (stays at 1 hour)

## Notes for Agents

- First visible chat message must identify the current role
- Append audit entries to `agent/tasks/task-009-user-types-and-guest-access.agents-audit.md`
- Tasks B and C may have already started adding `clientType` to their specific token types. This task should ensure it's consistent across ALL token types and handle the backward compatibility case.
- The guest archival job should be a new Spring `@Component` with a `@Scheduled` method. Use a cron expression like `0 0 3 * * *` (daily at 3 AM) or similar. Make it configurable if possible.
- The `displayName` for registered users comes from the `display_name` column (which may be NULL for existing registered users). For the validation response, return NULL/absent for users without a display name.
- When rejecting non-registered login attempts, use the same 401 response format as invalid credentials to avoid leaking information about which login identifiers exist.
