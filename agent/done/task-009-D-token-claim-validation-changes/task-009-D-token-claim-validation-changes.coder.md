# Coder Report

## Implemented Changes

### Step 1: `ValidateTokenResponse` extension (AuthDtos.kt)
- Added `clientType: String?` and `displayName: String?` nullable fields to `ValidateTokenResponse`, positioned before `expiresAt`

### Step 2: `AuthService.validateToken()` update (AuthService.kt)
- Extract `clientType` from JWT claims, defaulting to `"REGISTERED_USER"` for backward compatibility
- Extract `displayName` from JWT claims, falling back to `user.displayName` from database
- Both fields included in the `ValidateTokenResponse` construction

### Step 3: Login rejection of non-REGISTERED_USER (AuthService.kt)
- Added `if (user.clientType != ClientType.REGISTERED_USER) return null` after the active-status check in `login()`

### Step 4: `displayName` in login `UserSummary` (AuthService.kt)
- Added `displayName = user.displayName` to the `UserSummary` in the `LoginResponse`

### Step 5: `last_active_at` update on login (AuthService.kt)
- Added `userRepository.updateLastActiveAt(user.id)` call after password verification, before token issuance

### Step 6: `UserRepository.disableGuestsOlderThan()` (UserRepository.kt)
- Added `fun disableGuestsOlderThan(retentionDays: Int): Int` to the interface

### Step 7: `JdbcUserRepository.disableGuestsOlderThan()` (JdbcUserRepository.kt)
- Implemented with SQL `UPDATE users SET status = 'DISABLED' WHERE client_type = 'GUEST_USER' AND status = 'ACTIVE' AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`

### Step 8: `guest-retention-days` in application.yml
- Added `guest-retention-days: ${USERS_GUEST_RETENTION_DAYS:7}` under `app.security`

### Step 9: `guest-retention-days` in application-integration.yml
- Added `guest-retention-days: 7` under `app.security`

### Step 10: `@EnableScheduling` (UsersServiceApplication.kt)
- Added `@EnableScheduling` annotation and import to the application class

### Step 11: `GuestArchivalJob` (NEW FILE)
- Created `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/application/GuestArchivalJob.kt`
- `@Component` with `@Scheduled(cron = "${app.security.guest-archival-cron:0 0 3 * * *}")` method
- Injects `UserRepository` and `guest-retention-days` config value
- Logs start/end with guest count

### Step 12: OpenAPI spec update (openapi.yaml)
- Added `clientType` and `displayName` properties to `ValidateTokenResponse` schema with descriptions and examples

## Tests Added or Updated

### Step 13: Updated `login endpoint authenticates admin default credentials`
- Added assertions: `assertThat(user["clientType"]).isEqualTo("REGISTERED_USER")` and `assertThat(user["displayName"]).isEqualTo("admin")`

### Step 14: Updated `internal validation returns claims for valid token`
- Added assertions: `assertThat(response.body?.clientType).isEqualTo("REGISTERED_USER")` and `assertThat(response.body?.displayName).isEqualTo("admin")`

### Step 15: New test `login endpoint rejects guest user`
- Inserts a GUEST_USER with password, attempts login, asserts 401
- Uses `PasswordHasher` to create a valid password hash
- Cleans up in `finally` block

### Step 16: New test `login updates last_active_at`
- Logs in as admin, queries `last_active_at` from DB, asserts non-null

### Step 17: New test `validation defaults clientType to REGISTERED_USER for legacy tokens`
- Uses `buildLegacyToken()` helper that creates a JWT without `clientType` claim using jjwt directly
- Validates via internal endpoint, asserts `clientType` defaults to `REGISTERED_USER`

### Step 18: New test `guest archival disables guests older than retention period`
- Inserts old guest (10 days ago) and recent guest
- Calls `guestArchivalJob.archiveExpiredGuests()` directly
- Asserts old guest is DISABLED, recent guest is still ACTIVE
- Cleans up in `finally` block

### Test infrastructure
- Injected `PasswordHasher` and `GuestArchivalJob` as `@Autowired` fields
- Added `buildLegacyToken()` private helper using jjwt with test secret

## Domain Documentation Updates

### `domain-brain/entities/access-token.md`
- Added `clientType` and `displayName` to canonical fields with descriptions
- Updated lifetime note to mention variation by client type (1h registered/application, 24h guest)
- Added backward compatibility note for tokens without `clientType`

### `domain-brain/flows/user-authentication.md`
- Added step for login rejecting non-REGISTERED_USER accounts
- Added step for `last_active_at` update on login
- Added invariant for REGISTERED_USER-only login
- Added invariant for `last_active_at` update
- Added failure mode for non-registered user attempting login
- Added "Guest User Archival" section documenting the scheduled job

### `domain-brain/entities/user-account.md`
- Expanded canonical fields: added `clientType`, `displayName`, `applicationId`, `lastActiveAt` with types and nullability
- Updated notes: changed from "six predefined users" to "one predefined admin user"
- Added guest archival lifecycle note

## Assumptions

- The `created_at` column exists and is auto-populated by the database (from the Task A migration `001-create-users-table`)
- The `PasswordHasher.hash()` method exists and produces bcrypt hashes (used in Step 15 test)
- The `@EnableScheduling` annotation will not cause issues in integration tests because the cron expression `0 0 3 * * *` only fires at 3 AM and tests complete in seconds
- The `guest-archival-cron` property is not set in test config, so the default `0 0 3 * * *` applies (won't fire during tests); Step 18 tests the job by direct method invocation

## Known Limitations

- The `@EnableScheduling` annotation is global; if future tests are long-running or scheduled tasks become more frequent, a test-specific override may be needed
- The guest archival SQL uses MySQL-specific `DATE_SUB` function; not portable to other databases
- The backward compatibility test (Step 17) hard-codes the test JWT secret; if the test config changes, this test must be updated in sync
