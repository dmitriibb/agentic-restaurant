# Coder Report

## Implemented Changes

- Created `apps/staff-client/` as a standalone React application mirroring `apps/orders-client` conventions
- **Project scaffold**: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `.env.example`, `.dockerignore`
- **Shared API config** (`src/shared/api/config.ts`): service base URLs for `users-service` and `production-service`
- **Auth feature** (`src/features/auth/api.ts`, `src/features/auth/session.ts`): staff login via `POST /api/v1/auth/login`, session persistence using `sessionStorage` with key `staff-client-auth`
- **Production feature types** (`src/features/production/types.ts`): TypeScript types matching the exact PascalCase JSON serialization from the Go production-service structs (no JSON tags = PascalCase field names)
- **Production feature API** (`src/features/production/api.ts`): `fetchOrders`, `fetchOrderDetail`, `sendItemCommand` functions targeting the production-service REST API
- **Main application** (`src/App.tsx`): Single-component app with two states:
  - Unauthenticated: staff login form (registered only, no guest flow)
  - Authenticated: two-column production board (order list grouped by status on left, order detail with item actions on right)
  - Supports `pickup`, `block`, `resume`, `ready` item commands
  - Polling refresh every 5 seconds
  - Item action buttons based on current status (QUEUED -> pickup/block, IN_PROGRESS -> ready/block, BLOCKED -> resume)
- **Styles** (`src/styles.css`): Adapted from orders-client, added board-specific layout classes with status-colored badges and responsive breakpoints
- **Docker support**: `Dockerfile` (multi-stage build matching orders-client), `nginx.conf` (reverse proxy to users-service and production-service)
- **Docker Compose**: Added `staff-client` service on port `8085` depending on `users-service` and `production-service`
- **Entry point**: `src/main.tsx` with React, BrowserRouter, and StrictMode (identical pattern to orders-client)

## Tests Added or Updated

- `src/App.test.tsx` with 6 tests:
  1. **Shows staff login form when unauthenticated** - verifies Login/Password fields and Sign In button
  2. **Completes staff login and loads production board** - mocks login + board fetch, verifies auth status and order card rendering
  3. **Displays order detail when order is clicked** - pre-authenticates, clicks order card, verifies item details (menu name, line/unit, status)
  4. **Sends pickup command and refreshes board** - pre-authenticates, clicks pickup button, verifies POST to correct endpoint with auth header, verifies subsequent refresh calls
  5. **Restores session from storage** - sets sessionStorage, renders app, verifies auth status and board fetch with stored token
  6. **Logout clears session and shows login form** - verifies sessionStorage cleared and login form reappears

All 6 tests pass. Build succeeds (TypeScript + Vite).

## Domain Documentation Updates

- No `domain-brain/` changes required. Existing documentation already covers `staff-client`:
  - `domain-brain/flows/user-authentication.md` references staff-client
  - `domain-brain/flows/order-production.md` references staff-client
  - Entity, invariant, and state-machine docs are already up to date
- No `flow-index.yaml` changes required. `apps/staff-client` is already listed under `user_authentication` and `order_production` flows.

## Assumptions

- Production-service Go structs will continue to serialize as PascalCase JSON (no JSON tags). If tags are added later, the TypeScript types in `src/features/production/types.ts` must be updated.
- The command response shape uses lowercase keys (verified from Go source: `map[string]any{"itemId": ..., "orderId": ...}`), while list/detail responses use PascalCase (from struct serialization).
- SSE endpoint (`GET /api/v1/production/stream`) is not yet implemented in production-service. Polling at 5-second intervals is used as the fallback strategy per the plan.
- Port `8085` is available and does not conflict with other services.

## Known Limitations

- No SSE/real-time streaming support yet. The board relies on polling with `POLL_INTERVAL_MS = 5000`.
- The `block` command does not prompt for a reason input in the current UI. The API supports a `reason` field, but the UI sends commands without it. This can be enhanced with a modal or inline input in a follow-up.
- React `act()` warnings appear in the logout test due to background polling effects. These are cosmetic warnings that do not affect test correctness.
- No offline or error-recovery UI beyond displaying error messages.
