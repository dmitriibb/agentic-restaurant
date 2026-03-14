# Task: Backend Service Startup Auth and Inter-Service JWT

```yaml
id: task-009-E-backend-service-startup-auth
title: Backend service startup auth and inter-service JWT
status: done
priority: high
type: feature
architecture: not_requested
retry_count: 0
created_at: 2026-03-12
requested_by: human
parent_task: task-009-user-types-and-guest-access
areas:
  - apps/menu-service
  - apps/orders-service
flows:
  - user_authentication
  - menu_browsing
  - order_submission
dependencies:
  - task-009-B-application-token-pool
  - task-009-D-token-claim-validation-changes
validation:
  - menu-service acquires an application JWT on startup
  - orders-service acquires an application JWT on startup
  - menu-service internal resolve endpoint accepts Bearer JWT instead of X-Service-Token
  - orders-service calls menu-service resolve with Bearer JWT
  - Token auto-refresh works before expiry
  - Startup with users-service unavailable retries with exponential backoff
  - orders-service stores user_display_name on order records
  - SubmitOrderResponse includes userDisplayName
  - docker-compose.yml has application secret environment variables
  - All existing and new integration tests pass
```

## Summary

Implement application JWT acquisition at startup for menu-service and orders-service. Replace `X-Service-Token` header mechanism with `Authorization: Bearer` JWT for inter-service calls (except the token validation endpoint). Add `user_display_name` to the orders table and populate it from token validation responses. Update docker-compose.yml with application secret environment variables.

## Requirements

### menu-service Changes
- Create `StartupAuthClient.java`: acquires an application JWT by calling `POST /api/v1/auth/applications/token` on users-service at startup
  - Trigger: `@EventListener(ApplicationReadyEvent.class)` or `CommandLineRunner`
  - Stores JWT in memory (class field)
  - Schedules refresh at 80% of `expiresInSeconds` (configurable via `app.auth.token-refresh-factor`, default: 0.8)
  - On failure: logs warning, retries with exponential backoff (1s, 2s, 4s, 8s, max 30s). Service remains healthy but outbound authenticated calls fail until token acquired.
  - Provides a method like `getToken(): String?` for other components to retrieve the current token
- Modify `InternalMenuController.java`: switch the `/api/v1/internal/menu-items/resolve` endpoint from `X-Service-Token` header validation to `Authorization: Bearer` JWT validation
  - Validate the Bearer token by calling `POST /api/v1/internal/auth/validate` (using the existing `X-Service-Token` for the validate call itself)
  - Check that the caller's `clientType` is `APPLICATION`
  - Return 401 for missing/invalid token, 403 for non-APPLICATION caller
- Configuration: add `app.auth.application-name`, `app.auth.application-secret`, `app.auth.token-refresh-factor` to `application.yml`

### orders-service Changes
- Create `StartupAuthClient.kt`: same pattern as menu-service (Kotlin equivalent)
  - Acquires application JWT on startup, stores in memory, schedules refresh, retries on failure
- Modify `MenuLookupClient.kt`: switch from `X-Service-Token` header to `Authorization: Bearer <app-JWT>` for calls to menu-service's `/api/v1/internal/menu-items/resolve`
  - Get the JWT from `StartupAuthClient`
  - If no token available (startup still in progress), fail the request gracefully with appropriate error
- Modify `AuthValidationClient.kt` response handling: extract `clientType` and `displayName` from the extended validation response (from Task D)
- Modify `OrderSubmissionService.kt`: extract `displayName` from token validation response and pass to persistence
- Modify `OrderPersistence.kt`: store `user_display_name` on order INSERT
- Modify `OrderDtos.kt`: add `userDisplayName` to `SubmitOrderResponse`
- Add Liquibase migration to orders-service: add nullable `user_display_name VARCHAR(255)` column to `orders` table
- Configuration: add `app.auth.application-name`, `app.auth.application-secret`, `app.auth.token-refresh-factor` to `application.yml`

### Infrastructure Changes
- Update `docker-compose.yml`: add environment variables for all services:
  - menu-service: `APP_AUTH_NAME=menu-service`, `APP_AUTH_SECRET=menu-service-secret`
  - orders-service: `APP_AUTH_NAME=orders-service`, `APP_AUTH_SECRET=orders-service-secret`
  - orders-client: `VITE_APP_NAME=orders-client`, `VITE_APP_SECRET=orders-client-secret` (for Task F, but add env vars now)

### Tests
- Integration tests for menu-service: resolve endpoint accepts Bearer JWT, rejects X-Service-Token (unless it's also a valid JWT), rejects non-APPLICATION callers
- Integration tests for orders-service: order submission stores userDisplayName, response includes it
- Update existing tests as needed

## Acceptance Criteria

- menu-service logs successful application token acquisition on startup
- orders-service logs successful application token acquisition on startup
- menu-service resolve endpoint validates Bearer JWT and rejects old X-Service-Token
- orders-service calls menu resolve with Bearer JWT successfully
- Token refresh triggers before expiry (observable via logs)
- When users-service is unavailable at startup, services retry and eventually acquire token
- orders-service orders table has `user_display_name` column
- Orders created by guest users have their display name stored
- `SubmitOrderResponse` includes `userDisplayName`
- `docker-compose.yml` has all application secret environment variables
- Full docker-compose stack starts and the order submission flow works end-to-end

## Constraints

- Follow `AGENTS.md` rules
- `POST /api/v1/internal/auth/validate` retains the `X-Service-Token` guard -- do NOT change this
- menu-service is Java 21, orders-service is Kotlin -- respect language conventions for each
- The startup auth failure must NOT prevent the service from starting (health checks must still pass)
- Existing order records will have NULL `user_display_name` -- this is acceptable
- All database operations use JDBC (no JPA)
- Add or update tests for behavior changes

## Context

- Architecture design: `agent/tasks/task-009-user-types-and-guest-access.arch.md` (sections 5.5, 5.7, 8.5, 8.6, 9.4, 9.5, 9.6, 12.1 Task E, 12.4)
- Parent task: `agent/tasks/task-009-user-types-and-guest-access.md`
- Related files (menu-service):
  - `apps/menu-service/src/main/java/com/agentic/restaurant/menu/api/InternalMenuController.java`
  - `apps/menu-service/src/main/java/com/agentic/restaurant/menu/application/AuthValidationClient.java`
  - `apps/menu-service/src/main/resources/application.yml`
  - `apps/menu-service/src/main/resources/application-local.yml`
  - `apps/menu-service/src/test/java/com/agentic/restaurant/menu/MenuServiceApplicationTests.java`
- Related files (orders-service):
  - `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/clients/MenuLookupClient.kt`
  - `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/clients/AuthValidationClient.kt`
  - `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/clients/ClientModels.kt`
  - `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/application/OrderSubmissionService.kt`
  - `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/persistence/OrderPersistence.kt`
  - `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/persistence/OrderModels.kt`
  - `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/api/OrderDtos.kt`
  - `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/api/OrdersController.kt`
  - `apps/orders-service/src/main/resources/application.yml`
  - `apps/orders-service/src/main/resources/db/changelog/db.changelog-master.yaml`
  - `apps/orders-service/src/main/resources/db/changelog/changes/001-create-orders-schema.yaml`
  - `apps/orders-service/src/test/kotlin/com/agentic/restaurant/orders/OrdersServiceApplicationTests.kt`
- Infrastructure: `docker-compose.yml`
- Related docs: `domain-brain/flows/menu-browsing.md`, `domain-brain/flows/order-submission.md`
- Related flows: `user_authentication`, `menu_browsing`, `order_submission`
- Risks or dependencies: depends on Task B (application token endpoint) and Task D (extended validation response with clientType/displayName). Docker Compose startup ordering may cause transient failures during initial token acquisition.

## Out of Scope

- Changes to users-service (already handled in Tasks A-D)
- orders-client changes (Task F)
- Domain documentation (Task G)
- Removing the X-Service-Token config from the validate endpoint

## Notes for Agents

- First visible chat message must identify the current role
- Append audit entries to `agent/tasks/task-009-user-types-and-guest-access.agents-audit.md`
- The `StartupAuthClient` pattern is the same in both services but implemented in different languages (Java for menu-service, Kotlin for orders-service). Consider the idiomatic approach for each.
- For the token refresh scheduler, use `ScheduledExecutorService` or `@Scheduled` with a fixed delay calculated from the response's `expiresInSeconds` * `token-refresh-factor`.
- The `AuthValidationClient` in orders-service already parses the validation response. You need to add `clientType` and `displayName` to the parsed response model (e.g., in `ClientModels.kt`).
- For the orders table migration, add the changeset to the orders-service changelog. Follow the existing naming convention (e.g., `002-add-user-display-name.yaml`).
- In `docker-compose.yml`, the environment variables should use `APP_AUTH_NAME` and `APP_AUTH_SECRET` as the variable names, mapping to `app.auth.application-name` and `app.auth.application-secret` in Spring config. Also add `VITE_APP_NAME` and `VITE_APP_SECRET` for orders-client even though that service's code changes come in Task F.

