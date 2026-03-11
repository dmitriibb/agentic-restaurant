# AccessToken

## Definition

A JWT issued by `users-service` that authenticates a user for protected API calls.

## Canonical Fields

- `sub` or equivalent user id claim
- login claim
- roles claim
- issued-at timestamp
- expiry timestamp

## Ownership

- Issued by: `users-service`
- Consumed by: `orders-client`, `menu-service`, `orders-service`

## Notes

- Lifetime is one hour.
- Backend services validate the token through `users-service` in the initial architecture.
