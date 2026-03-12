# Task: Database Schema Changes for User Types and Applications

```yaml
id: task-009-A-database-schema-changes
title: Database schema changes for user types and applications
status: queued
priority: high
type: feature
architecture: not_requested
retry_count: 0
created_at: 2026-03-12
requested_by: human
parent_task: task-009-user-types-and-guest-access
areas:
  - apps/users-service
flows:
  - user_authentication
dependencies: []
validation:
  - users-service builds and starts successfully with new migrations
  - Existing admin user is present with client_type REGISTERED_USER and display_name admin
  - 5 demo customer/manager users are removed from seed data
  - applications table exists with 3 seeded application records
  - password_hash column is nullable
  - Existing integration tests pass (updated for seed data changes)
```

## Summary

Add Liquibase migrations to the users-service database to support three client types, the applications table, and seed data cleanup. Update the `UserAccount` domain entity and `JdbcUserRepository` to map new columns. Create the `Application` entity and `ApplicationRepository`. No new endpoints in this task.

## Requirements

- Add Liquibase migration `004-add-user-type-columns.yaml`: add `client_type VARCHAR(32) NOT NULL DEFAULT 'REGISTERED_USER'`, `display_name VARCHAR(255) NULL`, `application_id BIGINT NULL`, `last_active_at TIMESTAMP NULL` to the `users` table. Make `password_hash` nullable (change from `NOT NULL` to `NULL`). Backfill all existing rows with `client_type = 'REGISTERED_USER'`.
- Add Liquibase migration `005-create-applications-table.yaml`: create the `applications` table with columns `id BIGINT PK AUTO_INCREMENT`, `application_name VARCHAR(255) NOT NULL UNIQUE`, `secret_hash VARCHAR(255) NOT NULL`, `max_pool_size INT NOT NULL DEFAULT 30`, `status VARCHAR(32) NOT NULL`, `created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`. Add FK constraint from `users.application_id` to `applications.id`. Seed three application records: `orders-client`, `menu-service`, `orders-service` with PBKDF2-hashed local-dev secrets (`orders-client-secret`, `menu-service-secret`, `orders-service-secret`).
- Add Liquibase migration `006-cleanup-demo-seed-users.yaml`: delete the 5 demo customer/manager users (alex.customer, nina.customer, sam.customer, olga.manager, disabled.user -- IDs 1001-1005). Update the admin user (ID 1006) to set `client_type = 'REGISTERED_USER'` and `display_name = 'admin'`.
- Update the `UserAccount` domain entity to add fields: `clientType: ClientType`, `displayName: String?`, `applicationId: Long?`, `lastActiveAt: Instant?`. Add `ClientType` enum with values `REGISTERED_USER`, `GUEST_USER`, `APPLICATION`.
- Create `Application` domain entity: `id: Long`, `applicationName: String`, `secretHash: String`, `maxPoolSize: Int`, `status: ApplicationStatus`, `createdAt: Instant`. Add `ApplicationStatus` enum with values `ACTIVE`, `DISABLED`.
- Update `JdbcUserRepository` to read/write the new `users` table columns.
- Create `ApplicationRepository` interface and `JdbcApplicationRepository` implementation for the `applications` table with method `findByApplicationName(name: String): Application?`.
- Update existing integration tests to account for demo user removal (tests may reference demo users).

## Acceptance Criteria

- `users` table has 4 new columns (`client_type`, `display_name`, `application_id`, `last_active_at`) and `password_hash` is nullable
- All existing user rows have `client_type = 'REGISTERED_USER'` after migration
- `applications` table exists with 3 seeded records (orders-client, menu-service, orders-service) with status `ACTIVE`
- Application secret hashes in the seed match the plaintext local-dev defaults when verified with the existing `PasswordHasher`
- The 5 demo users (IDs 1001-1005) no longer exist after migration
- Admin user (ID 1006) has `client_type = 'REGISTERED_USER'` and `display_name = 'admin'`
- `UserAccount` entity maps all new columns correctly
- `Application` entity and repository are functional
- `users-service` starts successfully with all migrations applied
- Existing integration tests pass (updated as needed)

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to the task -- no new endpoints or API changes
- Migrations must be additive (no destructive changes to existing columns except making `password_hash` nullable)
- Use the same PBKDF2 hashing approach as existing `PasswordHasher` for application secrets
- Preserve existing Liquibase changeset IDs and structure conventions
- All database operations use JDBC (no JPA)
- Update domain knowledge files if schema changes warrant it

## Context

- Architecture design: `agent/tasks/task-009-user-types-and-guest-access.arch.md` (sections 7.1-7.5, 12.1 Task A, 12.3)
- Parent task: `agent/tasks/task-009-user-types-and-guest-access.md`
- Related files:
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/domain/UserAccount.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/persistence/UserRepository.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/persistence/JdbcUserRepository.kt`
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/security/PasswordHasher.kt`
  - `apps/users-service/src/main/resources/db/changelog/db.changelog-master.yaml`
  - `apps/users-service/src/main/resources/db/changelog/changes/001-create-users-table.yaml`
  - `apps/users-service/src/main/resources/db/changelog/changes/002-seed-users.yaml`
  - `apps/users-service/src/main/resources/db/changelog/changes/003-seed-admin-user.yaml`
  - `apps/users-service/src/main/resources/application.yml`
  - `apps/users-service/src/test/kotlin/com/agentic/restaurant/users/UsersServiceApplicationTests.kt`
- Related docs: `domain-brain/entities/user-account.md`
- Related flows: `user_authentication`
- Risks or dependencies: application secret hashing must produce the same format as user password hashing so the same `PasswordHasher` can verify both. Demo user removal may break existing tests that log in as demo users.

## Out of Scope

- New API endpoints (those come in Task B, C, D)
- JWT claim changes (Task D)
- Configuration properties for token lifetimes (Tasks B, C, D)
- Any changes to menu-service, orders-service, or orders-client

## Notes for Agents

- First visible chat message must identify the current role
- Append audit entries to `agent/tasks/task-009-user-types-and-guest-access.agents-audit.md`
- Use the existing `PasswordHasher` to generate PBKDF2 hashes for the application seed secrets. You may need to write a small utility or test to generate the hashes, or compute them programmatically in the migration seed (Liquibase custom change or pre-computed values).
- Check existing tests (`UsersServiceApplicationTests.kt`) for references to demo users (alex.customer, etc.) and update them to use admin or dynamically created test data.
- The `db.changelog-master.yaml` needs to include the 3 new changeset files.
- Follow the existing changeset naming and structure conventions from `001-create-users-table.yaml`, `002-seed-users.yaml`, `003-seed-admin-user.yaml`.
