# UserAccount

## Definition

An authenticated platform user owned by `users-service`.

## Canonical Fields

- `id: long`
- `login: string`
- `passwordHash: string`
- `status: string`
- `roles: string[]`

## Ownership

- Source of truth: `users-service`
- Persistence: MySQL

## Notes

- The first version is seeded with five predefined users.
- Passwords must never be stored or logged in plaintext.
