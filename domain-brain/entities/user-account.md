# UserAccount

## Definition

An authenticated platform user owned by `users-service`.

## Canonical Fields

- `id: long`
- `login: string`
- `passwordHash: string` (nullable - null for guest and application users)
- `status: string` (ACTIVE, DISABLED)
- `roles: string[]`
- `clientType: string` (REGISTERED_USER, GUEST_USER, APPLICATION)
- `displayName: string?` (nullable - set for guests at creation, optional for registered users)
- `applicationId: long?` (nullable - set only for APPLICATION users, references the applications table)
- `lastActiveAt: instant?` (nullable - updated on login and application token acquisition)

## Ownership

- Source of truth: `users-service`
- Persistence: MySQL

## Client Types

- `REGISTERED_USER`
  - Authenticates with login and password.
  - Allowed to use `POST /api/v1/auth/login`.
  - Receives a one-hour JWT.
- `GUEST_USER`
  - Created through `POST /api/v1/auth/guests` by an authenticated application caller.
  - Has no password hash.
  - Receives a 24-hour JWT and is archived after the retention period.
- `APPLICATION`
  - Represents service instances and trusted application clients.
  - Acquired through `POST /api/v1/auth/applications/token` with application name/secret.
  - Uses pooled user identities (`applicationId` set) and receives a one-hour JWT.

## Notes

- The first version is seeded with one predefined `admin` user for local development.
- Passwords must never be stored or logged in plaintext.
- Guest users are automatically archived (status set to DISABLED) by a daily scheduled job after a configurable retention period (default: 7 days from `created_at`).
