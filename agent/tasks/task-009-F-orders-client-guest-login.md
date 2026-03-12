# Task: orders-client Guest Login Flow

```yaml
id: task-009-F-orders-client-guest-login
title: orders-client guest login flow and app token management
status: queued
priority: high
type: feature
architecture: not_requested
retry_count: 0
created_at: 2026-03-12
requested_by: human
parent_task: task-009-user-types-and-guest-access
areas:
  - apps/orders-client
flows:
  - user_authentication
  - menu_browsing
  - order_submission
dependencies:
  - task-009-B-application-token-pool
  - task-009-C-guest-user-creation
  - task-009-E-backend-service-startup-auth
validation:
  - orders-client home screen shows both Login and Continue as Guest options
  - Application token is acquired on page load from env vars
  - Continue as Guest creates a guest user and stores JWT in sessionStorage
  - Guest user can browse menu and submit orders
  - Order confirmation shows user id and display name
  - Application token auto-refreshes before expiry
  - Registered login still works unchanged
  - orders-client builds successfully
  - Tests pass
```

## Summary

Implement the guest login flow in orders-client: application token management module (acquire on startup, cache in module scope, auto-refresh), "Continue as Guest" UI on the home screen, guest user creation via the API, and order confirmation displaying user id and display name.

## Requirements

### Application Token Management
- Create `src/features/auth/appToken.ts`: module for managing the orders-client application token
  - On first import (or explicit init call), check if a valid app token exists in module-scoped variable
  - If not, call `POST /api/v1/auth/applications/token` with `{ applicationName: VITE_APP_NAME, applicationSecret: VITE_APP_SECRET }` from environment variables
  - Store the received JWT in a module-scoped variable (NOT in sessionStorage or localStorage -- this is an app-level concern)
  - Set a timer to refresh at 80% of `expiresInSeconds`
  - Export `getAppToken(): Promise<string>` that returns the current token or acquires one if needed
  - Handle errors gracefully (log to console, retry with backoff)

### Environment Configuration
- Update `src/shared/api/config.ts` to expose `VITE_APP_NAME` and `VITE_APP_SECRET` from Vite env vars
- Update `.env.example` with `VITE_APP_NAME=orders-client` and `VITE_APP_SECRET=orders-client-secret`

### Auth API Functions
- Add to `src/features/auth/api.ts`:
  - `acquireAppToken(name: string, secret: string): Promise<AppTokenResponse>` -- calls `POST /api/v1/auth/applications/token`
  - `createGuestUser(displayName: string, appToken: string): Promise<GuestLoginResponse>` -- calls `POST /api/v1/auth/guests` with `Authorization: Bearer <appToken>`

### Session Handling
- Update `src/features/auth/session.ts` to include `clientType` in the session type
- Guest sessions are stored in `sessionStorage` the same way as registered sessions
- Session should carry enough info to display user type in UI if needed

### Home Screen UI Changes
- Modify `src/App.tsx` to split the home screen into two entry points:
  ```
  +----------------------------------+
  |     Welcome to Restaurant        |
  |                                  |
  |  [    Login (Registered)    ]    |
  |                                  |
  |  [   Continue as Guest      ]    |
  |                                  |
  +----------------------------------+
  ```
- **"Login (Registered)"**: existing flow, no changes
- **"Continue as Guest"**: shows a name input field. On submit:
  1. Get app token via `getAppToken()`
  2. Call `createGuestUser(displayName, appToken)`
  3. Store guest JWT in sessionStorage
  4. Navigate to menu screen

### Order Confirmation Display
- Update the order confirmation UI to show user id and display name
- The `SubmitOrderResponse` from Task E now includes `userDisplayName`
- Display format: show the user's display name (for guests) or login (for registered users)

### Nginx Configuration
- Update `nginx.conf` to proxy the new auth endpoints:
  - `/api/v1/auth/guests` -> users-service
  - `/api/v1/auth/applications/token` -> users-service
  - (These may already be covered by existing `/api/v1/auth/` proxy rules -- verify and update if needed)

### Tests
- Update `src/App.test.tsx` to cover:
  - Home screen renders both login options
  - Guest login flow: name input -> submit -> API calls -> menu screen
  - Registered login still works
- Add tests for `appToken.ts` module if feasible (may need mocking)

## Acceptance Criteria

- Home screen shows "Login (Registered)" and "Continue as Guest" buttons
- Clicking "Continue as Guest" shows a name input field
- Submitting a name creates a guest user and navigates to the menu
- Guest user can browse menu items
- Guest user can submit an order
- Order confirmation displays user display name
- Application token is acquired automatically and refreshed before expiry
- Registered user login flow is unchanged
- `VITE_APP_NAME` and `VITE_APP_SECRET` are read from environment
- orders-client builds with `npm run build`
- Tests pass with `npm test`

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to orders-client only
- Preserve the existing feature-sliced directory structure
- The application token is stored in JavaScript module scope, NOT in browser storage
- User session (guest or registered) is stored in `sessionStorage` (existing pattern)
- Use `fetch` API for HTTP calls (existing pattern -- no axios or other libraries)
- The app token is ONLY used for the guest creation endpoint. All user-facing API calls use the user's own JWT.
- Add or update tests for behavior changes

## Context

- Architecture design: `agent/tasks/task-009-user-types-and-guest-access.arch.md` (sections 5.6, 10.1, 12.1 Task F, 12.4)
- Parent task: `agent/tasks/task-009-user-types-and-guest-access.md`
- Related files:
  - `apps/orders-client/src/App.tsx`
  - `apps/orders-client/src/App.test.tsx`
  - `apps/orders-client/src/features/auth/api.ts`
  - `apps/orders-client/src/features/auth/session.ts`
  - `apps/orders-client/src/features/menu/api.ts`
  - `apps/orders-client/src/features/orders/api.ts`
  - `apps/orders-client/src/features/basket/model.ts`
  - `apps/orders-client/src/shared/api/config.ts`
  - `apps/orders-client/nginx.conf`
  - `apps/orders-client/.env.example`
  - `apps/orders-client/package.json`
  - `apps/orders-client/vite.config.ts`
  - `apps/orders-client/src/main.tsx`
  - `apps/orders-client/src/test/setup.ts`
- Related docs: `domain-brain/flows/user-authentication.md`, `domain-brain/flows/menu-browsing.md`
- Related flows: `user_authentication`, `menu_browsing`, `order_submission`
- Risks or dependencies: depends on Tasks B (app token endpoint), C (guest creation endpoint), and E (docker-compose env vars, extended order response). The app token and secret are exposed in the browser -- this is accepted per the architecture design (section 5.6).

## Out of Scope

- Backend changes (all handled in Tasks A-E)
- Guest token refresh (guests do not refresh tokens)
- Admin functionality
- Styling/CSS beyond basic functional layout
- Domain documentation (Task G)

## Notes for Agents

- First visible chat message must identify the current role
- Append audit entries to `agent/tasks/task-009-user-types-and-guest-access.agents-audit.md`
- The current `App.tsx` is a single large component. Read it carefully to understand the existing screen/state flow before modifying.
- The app token module (`appToken.ts`) should be lazy -- it acquires the token on first use, not on module import. Use a promise-based pattern so callers can `await getAppToken()`.
- The nginx.conf likely already has a location block for `/api/v1/auth/` that proxies to users-service. Verify this covers the new endpoints. If the existing rule uses an exact path match, add the new paths.
- The `displayName` input for guest login should have client-side validation: non-blank, max 100 characters (matching the backend validation).
- For the order confirmation display, check how the current code handles the `SubmitOrderResponse` and where it's rendered. Add `userDisplayName` to the display.
