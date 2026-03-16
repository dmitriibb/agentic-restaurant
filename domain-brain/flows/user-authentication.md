# User Authentication Flow

## Goal

Authenticate registered users, guest users, display-screen application callers, and backend application callers, then issue JWTs used for protected API calls.

## Registered User Flow

1. `orders-client` or `staff-client` first shows a mode-based entry screen and does not mount the main working interface when there is no valid session.
2. After the user chooses the registered path, the client shows the registered login form.
3. Client calls `POST /api/v1/auth/login` with login and password.
4. `users-service` verifies password hash, user status, and that `clientType = REGISTERED_USER`.
5. `users-service` updates `last_active_at` on successful login.
6. `users-service` returns a one-hour JWT with user identity and claims.
7. The client stores the user token together with the selected UI mode and sends the token in the `Authorization` header for protected calls.
8. Downstream services authorize features by role, for example `production-service` allows `STAFF`, `MANAGER`, and `ADMIN` on interactive staff endpoints.

## Guest Authentication Flow

1. `orders-client` shows a landing screen with `Login as Registered` and `Login as Guest`.
2. After the terminal user chooses guest mode and enters a display name, `orders-client` acquires an application token via `POST /api/v1/auth/applications/token`.
3. Client calls `POST /api/v1/auth/guests` with bearer app token.
4. `users-service` validates caller is `APPLICATION`, creates a `GUEST_USER`, and issues a 24-hour JWT.
5. Client stores the guest JWT together with `mode = guest` in session storage and proceeds with menu browsing and order submission.

## Staff Display Flow

1. `staff-client` shows a landing screen with `Interactive` and `Display`.
2. When the operator chooses `Display`, the client does not ask for username or password.
3. `staff-client` acquires an application token via `POST /api/v1/auth/applications/token` using the configured display credentials.
4. The client stores `mode = display` in UI session state and loads the read-only production board.
5. `production-service` authorizes that application token only for display-board endpoints; item-mutation endpoints remain unavailable.

## Application Authentication Flow

1. Service instance or trusted app client calls `POST /api/v1/auth/applications/token` with application name and secret.
2. `users-service` verifies application credentials and allocates a pooled application user.
3. `users-service` issues a one-hour JWT for the pooled application user.
4. Callers refresh token before expiry (typically at 80% of token lifetime).
5. Browser applications use application tokens only for scoped flows such as guest creation or the read-only display board, and should keep those tokens in memory rather than browser storage.
6. If startup acquisition fails, services retry with exponential backoff until token is available.

## Token Validation Path

1. Protected backend endpoints validate bearer tokens through `POST /api/v1/internal/auth/validate`.
2. The validate endpoint itself remains guarded by `X-Service-Token` to avoid circular dependency.
3. Validation response includes user identity, roles, `clientType`, and display name metadata.

## Output

- authenticated user id
- JWT access token
- token expiry metadata
- client type metadata
- UI mode metadata in the client session when mode-based UX is used

## Invariants

- Only active users can authenticate.
- Only `REGISTERED_USER` accounts can use the login endpoint.
- Guest creation requires an authenticated `APPLICATION` caller.
- The main UI surface stays hidden until a valid mode and session are established.
- `staff-client` display mode is passwordless for humans but still backend-authenticated via an application token.
- Passwords are verified against hashes only.
- Registered/application token lifetime is one hour.
- Guest token lifetime is 24 hours (configurable).
- `last_active_at` is updated on successful login and application token acquisition.

## Failure Modes

- invalid login or password
- expired token
- disabled user
- non-registered user attempting login (guest or application)
- guest creation called by non-application token
- display-mode application token acquisition fails before the board can load
- application token pool exhausted
- downstream validation service unavailable

## Guest User Archival

- A daily scheduled job (default: 3 AM) disables guest users whose `created_at` is older than the configurable retention period (`app.security.guest-retention-days`, default: 7 days).
- Only targets `GUEST_USER` accounts with `status = ACTIVE`.
- Logs the count of archived guest users.
