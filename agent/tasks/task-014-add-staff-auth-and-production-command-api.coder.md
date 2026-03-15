# Coder Report

## Implemented Changes

### users-service
- Added Liquibase migration `007-seed-staff-users-and-production-app.yaml`:
  - Registers `production-service` as an application (id: 4) with PBKDF2-hashed secret
  - Seeds `staff1` user (id: 1007) with STAFF role and password hash for `staff123`
  - Seeds `manager1` user (id: 1008) with MANAGER role and password hash for `manager123`
- Registered migration in `db.changelog-master.yaml`

### production-service
- **Config** (`internal/config/config.go`): Added `UsersServiceURL` and `UsersServiceToken` fields
- **Auth client** (`internal/auth/client.go`): HTTP client that calls `POST /api/v1/internal/auth/validate` on users-service with `X-Service-Token` header
- **Auth middleware** (`internal/auth/middleware.go`): `RequireStaffRole` middleware that validates bearer tokens and checks for STAFF or MANAGER role; returns 401/403 appropriately; stores claims in context
- **Transition validation** (`internal/domain/transitions.go`): Defines valid state machine transitions for pickup, block, resume, ready commands; returns error for invalid transitions
- **Event payloads** (`internal/domain/events.go`): Added `ItemStatusChangedOutbound` and `OrderReadyOutbound` structs
- **Store methods** (`internal/store/store.go`): Added `ListOrdersByStatus`, `GetOrderByID`, `ListItemsByOrderID`, `GetItemByID` (with FOR UPDATE), `UpdateItemStatus` (optimistic locking), `GetOrderByIDInTx`
- **API handlers** (`internal/api/handlers.go`): 
  - `GET /api/v1/production/orders` with optional status filter and limit
  - `GET /api/v1/production/orders/{orderId}` returns order + items
  - `POST /api/v1/production/items/{itemId}/pickup`
  - `POST /api/v1/production/items/{itemId}/block` (with optional reason)
  - `POST /api/v1/production/items/{itemId}/resume`
  - `POST /api/v1/production/items/{itemId}/ready`
  - All commands use transactional flow: validate transition → update item with version check → derive order status → write outbox events → commit
- **Main wiring** (`cmd/production-service/main.go`): Created auth client, mounted API routes behind auth middleware

### docker-compose.yml
- Added `USERS_SERVICE_URL` and `USERS_SERVICE_TOKEN` env vars to production-service

## Tests Added or Updated

- `internal/domain/transitions_test.go`: 5 valid transition tests + 12 invalid transition tests
- `internal/auth/middleware_test.go`: 6 tests (STAFF allowed, MANAGER allowed, missing header → 401, invalid token → 401, insufficient role → 403, nil context)
- `internal/api/handlers_test.go`: 10 tests (list orders, filter by status, get order, order not found, pickup success, pickup invalid → 409, item not found, no auth → 401, version conflict → 409, block with reason)

## Domain Documentation Updates

- `domain-brain/flows/user-authentication.md` — already references staff login and production-service authorization (no changes needed)
- `flow-index.yaml` — already lists production-service under both `user_authentication` and `order_production` flows (no changes needed)

## Assumptions

- Staff identity is derived from the validated JWT token via users-service, not from request body (per architecture doc and task notes)
- Seed passwords (`staff123`, `manager123`) are for local development only
- `production-service-secret` is the application secret for production-service registration

## Known Limitations

- SSE streaming endpoint (`/api/v1/production/stream`) is out of scope for this task (listed in architecture but not in task-014 requirements)
- CANCELLED transition commands are not implemented (the architecture defines CANCELLED as reachable but no command endpoint is specified for it in the scope)
