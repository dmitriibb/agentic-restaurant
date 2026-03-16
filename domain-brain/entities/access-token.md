# AccessToken

## Definition

A JWT issued by `users-service` that authenticates a user for protected API calls.

## Canonical Fields

- `sub` or equivalent user id claim
- login claim
- roles claim
- `clientType` claim - one of `REGISTERED_USER`, `GUEST_USER`, `APPLICATION`. Tokens issued before this field was added default to `REGISTERED_USER` during validation.
- `displayName` claim - present for guest users; registered and application users may resolve display name from persistence.
- issued-at timestamp
- expiry timestamp

## Ownership

- Issued by: `users-service`
- Consumed by: `orders-client`, `staff-client`, `menu-service`, `orders-service`, `production-service`

## Notes

- Lifetime varies by client type: 1 hour for registered and application users, 24 hours for guest users.
- Guest token expiration is configurable (`app.security.guest-token-expiration-seconds`).
- Application tokens are used by backend services and the guest-creation path in `orders-client`.
- Backward compatibility: tokens without a `clientType` claim are treated as `REGISTERED_USER` during validation.
- Staff production access is authorized by roles in the token claims, with `STAFF`, `MANAGER`, and `ADMIN` allowed.
