# Implementation Plan

## Task Summary

Add staff-facing production read and command APIs to `production-service`, secure them with bearer-token validation and role checks through `users-service`, seed staff-capable roles/accounts, and enforce transition guards with conflict responses on invalid state changes.

## Architecture Input

- `source_architecture`: task-010-order-production-pipeline-architecture
- Reference: `agent/done/task-010-order-production-pipeline-architecture/task-010-order-production-pipeline-architecture.arch.md`

## Affected Areas

- `apps/production-service` — new auth middleware, HTTP handlers for read/command APIs, store queries for reads and mutations, domain transition validation, config for users-service URL/token
- `apps/users-service` — new Liquibase migration to seed STAFF and MANAGER users; register production-service as an application
- `docker-compose.yml` — add users-service URL and service-token env vars to production-service
- `domain-brain/flows/user-authentication.md` — add staff login reference
- `flow-index.yaml` — confirm production-service paths are listed under `user_authentication` flow

## Steps

### 1. Seed staff users and register production-service in users-service

1a. Create Liquibase migration `007-seed-staff-users-and-production-app.yaml`:
  - Insert `production-service` application row (name: `production-service`, secret hash for `production-service-secret`, maxPoolSize: 30, status: ACTIVE)
  - Insert staff user: login=`staff1`, password hash for `staff123`, roles=`STAFF`, clientType=`REGISTERED_USER`, status=ACTIVE, displayName=`Staff One`
  - Insert manager user: login=`manager1`, password hash for `manager123`, roles=`MANAGER`, clientType=`REGISTERED_USER`, status=ACTIVE, displayName=`Manager One`

1b. Register the migration in `db.changelog-master.yaml`.

### 2. Add users-service config to production-service

2a. Add new config fields to `internal/config/config.go`:
  - `UsersServiceURL` (env: `USERS_SERVICE_URL`, default: `http://users-service:8081`)
  - `UsersServiceToken` (env: `USERS_SERVICE_TOKEN`, default: `local-dev-token`)

### 3. Add auth client in production-service

3a. Create `internal/auth/client.go`:
  - `Client` struct with `usersServiceURL`, `serviceToken`, and `*http.Client`
  - `ValidateToken(ctx, bearerToken) (*UserClaims, error)` method that calls `POST /api/v1/internal/auth/validate` with `X-Service-Token` header and bearer token in request body
  - `UserClaims` struct: `UserID int64`, `Login string`, `Roles []string`, `ClientType string`, `DisplayName string`

### 4. Add auth middleware in production-service

4a. Create `internal/auth/middleware.go`:
  - `RequireStaffRole(client *Client, next http.Handler) http.Handler` middleware that:
    - Extracts `Authorization: Bearer <token>` from request
    - Calls `client.ValidateToken` 
    - Checks user has `STAFF` or `MANAGER` role
    - Returns 401 if no/invalid token, 403 if insufficient role
    - Stores `UserClaims` in request context for downstream handlers
  - `ClaimsFromContext(ctx) *UserClaims` context helper

### 5. Add domain transition validation

5a. Create `internal/domain/transitions.go`:
  - `ValidTransitions` map defining allowed transitions per the production-item-lifecycle state machine:
    - QUEUED → IN_PROGRESS (pickup)
    - QUEUED → BLOCKED (block)
    - IN_PROGRESS → READY (ready)
    - IN_PROGRESS → BLOCKED (block)
    - BLOCKED → IN_PROGRESS (resume)
  - `ValidateTransition(currentStatus, command string) (newStatus string, err error)` function
  - Command constants: `CommandPickup`, `CommandBlock`, `CommandResume`, `CommandReady`

### 6. Add store methods for reads and mutations

6a. Add to `internal/store/store.go`:
  - `ListOrdersByStatus(ctx, status string, limit int) ([]domain.ProductionOrder, error)` — for board view
  - `GetOrderByID(ctx, orderID int64) (*domain.ProductionOrder, error)` — for order detail
  - `ListItemsByOrderID(ctx, orderID int64) ([]domain.ProductionItem, error)` — for order detail
  - `GetItemByID(ctx, tx TxHandle, itemID string) (*domain.ProductionItem, error)` — for mutation
  - `UpdateItemStatus(ctx, tx TxHandle, itemID string, newStatus string, expectedVersion int64, claimedByUserID *int64, claimedByDisplayName *string, blockedReason *string) (bool, error)` — conditional update with version check, returns false if version mismatch

### 7. Add domain event payloads for item mutations

7a. Add to `internal/domain/events.go`:
  - `ItemStatusChangedOutbound` struct with fields: OrderID, ItemID, LineNumber, UnitSequence, MenuItemName, Status, StaffUserID, StaffDisplayName, OccurredAt
  - `OrderReadyOutbound` struct with fields: OrderID, RequestID, Status, ReadyAt, TotalItemCount, ReadyItemCount, OccurredAt

### 8. Implement production HTTP handlers

8a. Create `internal/api/handlers.go`:
  - `Handlers` struct with store, logger dependencies
  - `Register(mux, authMiddleware)` to mount routes under the middleware
  - `GET /api/v1/production/orders` — query param `status` (optional), `limit` (default 50)
  - `GET /api/v1/production/orders/{orderId}` — returns order + items
  - `POST /api/v1/production/items/{itemId}/pickup`
  - `POST /api/v1/production/items/{itemId}/block` — accepts optional `reason` in body
  - `POST /api/v1/production/items/{itemId}/resume`
  - `POST /api/v1/production/items/{itemId}/ready`

8b. Command handler logic (shared pattern for all 4 commands):
  - Parse `itemId` from URL path
  - Parse optional `expectedVersion` from request body
  - Extract staff claims from context
  - Begin transaction
  - Load item by ID (within tx)
  - Validate transition using `ValidateTransition`
  - If invalid transition → 409 Conflict
  - Update item status with version check
  - If version mismatch → 409 Conflict  
  - Count items by status, derive order status, update order
  - Write outbox event for item status change
  - If order became READY, write order.ready outbox event
  - Commit transaction
  - Return updated item

### 9. Wire new components in main.go

9a. Update `cmd/production-service/main.go`:
  - Create auth client from config
  - Create API handlers
  - Register API routes with auth middleware on the existing mux

### 10. Update docker-compose.yml

10a. Add to production-service environment:
  - `USERS_SERVICE_URL: http://users-service:8081`
  - `USERS_SERVICE_TOKEN: local-dev-token`

### 11. Add tests

11a. Create `internal/domain/transitions_test.go`:
  - Test all valid transitions
  - Test invalid transitions return error

11b. Create `internal/auth/middleware_test.go`:
  - Test successful auth with STAFF role
  - Test successful auth with MANAGER role
  - Test missing Authorization header → 401
  - Test invalid token → 401
  - Test insufficient role (CUSTOMER) → 403

11c. Create `internal/api/handlers_test.go`:
  - Test GET /api/v1/production/orders returns list
  - Test GET /api/v1/production/orders/{orderId} returns order + items
  - Test POST pickup success path
  - Test POST pickup invalid transition → 409
  - Test command without auth → 401

## Tests

- `go test ./...` in `apps/production-service` must pass
- `mvn test` in `apps/users-service` must pass (migration is additive, existing tests should still pass)
- Transition tests: all valid transitions succeed, invalid transitions return error
- Auth middleware tests: valid STAFF/MANAGER pass, missing/invalid/wrong-role fail
- API handler tests: success paths and failure paths for reads and commands

## Domain Documentation Updates

- Update `domain-brain/flows/user-authentication.md` to mention staff login for production-service
- Confirm `flow-index.yaml` has production-service under `user_authentication` paths (already present)

## Open Questions

- None. All design decisions are covered by the source architecture.
