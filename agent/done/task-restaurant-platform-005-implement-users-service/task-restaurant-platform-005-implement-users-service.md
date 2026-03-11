# Task: Implement Users Service Business Logic

```yaml
id: task-restaurant-platform-005-implement-users-service
title: Implement authentication business logic in users-service
status: done
priority: high
type: feature
architecture: not_requested
retry_count: 0
created_at: 2026-03-11
requested_by: human
areas:
  - apps/users-service
  - domain-brain
flows:
  - user_authentication
dependencies:
  - task-restaurant-platform-001-init-users-service
validation:
  - Login endpoint authenticates valid credentials and rejects invalid ones
  - JWT issuance returns a one-hour token
  - Internal token validation endpoint returns user claims for valid tokens
  - Liquibase seeds five predefined users
  - Automated tests cover login and token validation behavior
```

## Summary

Implement the actual authentication behavior in `users-service`, including predefined users, login/password verification, JWT issuance, and internal JWT validation.

## Requirements

- Define and generate the OpenAPI contract for login and internal token validation.
- Add Liquibase schema and seed data for five predefined users.
- Implement password hashing and credential verification.
- Issue JWTs with a one-hour lifetime.
- Implement the internal validation endpoint used by other services.
- Add tests for valid login, invalid login, expired token, and validation responses.

## Acceptance Criteria

- `users-service` supports the documented login flow.
- Valid credentials return a signed JWT and user metadata.
- Invalid or inactive users are rejected.
- Internal validation verifies token integrity and returns subject claims needed downstream.
- Seeded demo users exist after startup.

## Constraints

- Preserve `users-service` as the only credential and token owner.
- Keep internal validation browser-inaccessible by design.
- Stay aligned with the architecture document and current domain invariants.

## Context

- Related files: `agent/tasks/task-restaurant-platform-architecture-001.arch.md`
- Related docs: `domain-brain/flows/user-authentication.md`, `domain-brain/invariants.md`
- Related flows: `user_authentication`
- Risks or dependencies: signing key management and seed-user password handling must stay safe for local development

## Out of Scope

- User registration
- Password reset
- External identity providers

## Notes for Agents

- Update `domain-brain/` and `flow-index.yaml` if implementation introduces concrete module paths or contract details beyond the current architecture docs.
