# User Authentication Flow

## Goal

Authenticate a user with login and password, then issue a JWT used for subsequent API calls.

## Steps

1. `orders-client` shows a login form when no valid token is available.
2. Client calls `users-service` with login and password.
3. `users-service` verifies the password hash and user status.
4. `users-service` returns a JWT with a one-hour lifetime and the authenticated user id.
5. Client stores the token and sends it in the `Authorization` header on every later request.
6. `menu-service` and `orders-service` call the internal validation endpoint on `users-service` with a service credential before processing protected requests.

## Output

- authenticated user id
- JWT access token
- token expiry metadata

## Invariants

- Only active users can authenticate.
- Passwords are verified against hashes only.
- Token lifetime is one hour.

## Failure Modes

- invalid login or password
- expired token
- disabled user
- downstream validation service unavailable
