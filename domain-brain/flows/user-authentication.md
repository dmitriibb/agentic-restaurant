# User Authentication Flow

## Goal

Authenticate registered users, guest users, and application callers, then issue JWTs used for protected API calls.

## Registered User Flow

1. `orders-client` shows the registered login form when there is no authenticated user session.
2. Client calls `POST /api/v1/auth/login` with login and password.
3. `users-service` verifies password hash, user status, and that `clientType = REGISTERED_USER`.
4. `users-service` updates `last_active_at` on successful login.
5. `users-service` returns a one-hour JWT with user identity and claims.
6. Client stores the user token and sends it in the `Authorization` header for protected calls.

## Guest Authentication Flow

1. `orders-client` acquires an application token via `POST /api/v1/auth/applications/token`.
2. Terminal user enters a display name and client calls `POST /api/v1/auth/guests` with bearer app token.
3. `users-service` validates caller is `APPLICATION`, creates a `GUEST_USER`, and issues a 24-hour JWT.
4. Client stores the guest JWT in session storage and proceeds with menu browsing and order submission.

## Application Authentication Flow

1. Service instance or trusted app client calls `POST /api/v1/auth/applications/token` with application name and secret.
2. `users-service` verifies application credentials and allocates a pooled application user.
3. `users-service` issues a one-hour JWT for the pooled application user.
4. Callers refresh token before expiry (typically at 80% of token lifetime).
5. If startup acquisition fails, services retry with exponential backoff until token is available.

## Token Validation Path

1. Protected backend endpoints validate bearer tokens through `POST /api/v1/internal/auth/validate`.
2. The validate endpoint itself remains guarded by `X-Service-Token` to avoid circular dependency.
3. Validation response includes user identity, roles, `clientType`, and display name metadata.

## Output

- authenticated user id
- JWT access token
- token expiry metadata
- client type metadata

## Invariants

- Only active users can authenticate.
- Only `REGISTERED_USER` accounts can use the login endpoint.
- Guest creation requires an authenticated `APPLICATION` caller.
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
- application token pool exhausted
- downstream validation service unavailable

## Guest User Archival

- A daily scheduled job (default: 3 AM) disables guest users whose `created_at` is older than the configurable retention period (`app.security.guest-retention-days`, default: 7 days).
- Only targets `GUEST_USER` accounts with `status = ACTIVE`.
- Logs the count of archived guest users.
