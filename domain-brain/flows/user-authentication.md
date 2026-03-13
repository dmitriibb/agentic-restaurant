# User Authentication Flow

## Goal

Authenticate a user with login and password, then issue a JWT used for subsequent API calls.

## Steps

1. `orders-client` shows a login form when no valid token is available.
2. Client calls `users-service` with login and password.
3. `users-service` verifies the password hash and user status.
4. `users-service` rejects login attempts from non-`REGISTERED_USER` accounts (guest and application users cannot use the login endpoint).
5. `users-service` updates `last_active_at` on successful login.
6. `users-service` returns a JWT with a one-hour lifetime and the authenticated user id.
7. Client stores the token and sends it in the `Authorization` header on every later request.
8. `menu-service` and `orders-service` call the internal validation endpoint on `users-service` with a service credential before processing protected requests.

## Output

- authenticated user id
- JWT access token
- token expiry metadata

## Invariants

- Only active users can authenticate.
- Only `REGISTERED_USER` accounts can use the login endpoint.
- Passwords are verified against hashes only.
- Token lifetime is one hour.
- `last_active_at` is updated on every successful login.

## Failure Modes

- invalid login or password
- expired token
- disabled user
- non-registered user attempting login (guest or application)
- downstream validation service unavailable

## Guest User Archival

- A daily scheduled job (default: 3 AM) disables guest users whose `created_at` is older than the configurable retention period (`app.security.guest-retention-days`, default: 7 days).
- Only targets `GUEST_USER` accounts with `status = ACTIVE`.
- Logs the count of archived guest users.
