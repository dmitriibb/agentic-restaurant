# AccessToken

## Definition

A JWT issued by `users-service` that authenticates a user for protected API calls.

## Canonical Fields

- `sub` or equivalent user id claim
- login claim
- roles claim
- `clientType` claim — one of `REGISTERED_USER`, `GUEST_USER`, `APPLICATION`. Tokens issued before this field was added default to `REGISTERED_USER` during validation.
- `displayName` claim — present for guest users; registered and application users resolve display name from the database
- issued-at timestamp
- expiry timestamp

## Ownership

- Issued by: `users-service`
- Consumed by: `orders-client`, `menu-service`, `orders-service`

## Notes

- Lifetime varies by client type: 1 hour for registered and application users, 24 hours for guest users.
- Backend services validate the token through `users-service` in the initial architecture.
- Backward compatibility: tokens without a `clientType` claim are treated as `REGISTERED_USER` during validation.
