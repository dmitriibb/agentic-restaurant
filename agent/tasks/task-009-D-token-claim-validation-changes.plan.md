# Implementation Plan

## Task Summary

Extend the token validation endpoint response to include `clientType` and `displayName`. Update the login endpoint to reject non-REGISTERED_USER accounts, return `displayName` in the user summary, and update `last_active_at` on success. Implement a daily scheduled job that archives (disables) guest users older than a configurable retention period. Update OpenAPI spec and integration tests.

JWT claim changes (adding `clientType` and `displayName` to issued tokens) were already completed in Tasks A/B/C. This plan covers only the remaining work.

## Architecture Input

- not requested (architecture exists from parent task)
- Reference: `agent/tasks/task-009-user-types-and-guest-access.arch.md` (sections 5.8, 8.3, 8.4, 9.3, 10.5, 12.1 Task D)

## Affected Areas

- `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/api/AuthDtos.kt` -- add fields to `ValidateTokenResponse`
- `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/application/AuthService.kt` -- update `validateToken()`, update `login()`
- `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/persistence/UserRepository.kt` -- add `disableGuestsOlderThan()` method
- `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/persistence/JdbcUserRepository.kt` -- implement `disableGuestsOlderThan()`
- `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/application/GuestArchivalJob.kt` -- new file: scheduled job
- `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/UsersServiceApplication.kt` -- add `@EnableScheduling`
- `apps/users-service/src/main/resources/application.yml` -- add `guest-retention-days` config
- `apps/users-service/src/test/resources/application-integration.yml` -- add `guest-retention-days` config
- `apps/users-service/api/openapi.yaml` -- extend `ValidateTokenResponse` schema
- `apps/users-service/src/test/kotlin/com/agentic/restaurant/users/UsersServiceApplicationTests.kt` -- update and add tests
- `domain-brain/entities/access-token.md` -- add `clientType` and `displayName` claims
- `domain-brain/flows/user-authentication.md` -- add guest archival and login rejection notes

## Steps

### Step 1: Add `clientType` and `displayName` fields to `ValidateTokenResponse`

**File:** `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/api/AuthDtos.kt`

**Change:** Add two nullable fields to the `ValidateTokenResponse` data class:

```kotlin
data class ValidateTokenResponse(
    val valid: Boolean,
    val userId: Long? = null,
    val login: String? = null,
    val roles: List<String> = emptyList(),
    val clientType: String? = null,       // NEW
    val displayName: String? = null,      // NEW
    val expiresAt: Instant? = null,
)
```

**Why:** The architecture requires the validation response to include `clientType` and `displayName` so downstream services (menu-service, orders-service) can identify caller types and display names without additional lookups.

---

### Step 2: Update `AuthService.validateToken()` to populate `clientType` and `displayName`

**File:** `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/application/AuthService.kt`

**Change:** In the `validateToken()` method, inside the `JwtParseResult.Valid` branch, extract `clientType` from the JWT claims (defaulting to `REGISTERED_USER` if absent for backward compatibility), and resolve `displayName` from the JWT claim first, falling back to the database `display_name` column.

Replace the existing `ValidateTokenResponse(...)` construction in the `Valid` branch (lines 83-89) with:

```kotlin
val clientType = parseResult.claims["clientType"] as? String ?: "REGISTERED_USER"
val displayName = parseResult.claims["displayName"] as? String ?: user.displayName
ValidateTokenResponse(
    valid = true,
    userId = userId,
    login = login,
    roles = roles,
    clientType = clientType,
    displayName = displayName,
    expiresAt = expiresAt,
)
```

**Why:** `clientType` from JWT claim handles both new tokens (with claim) and old tokens (default to REGISTERED_USER). `displayName` from JWT claim handles guests (where name is in the token), falling back to DB column for registered/application users.

---

### Step 3: Update `AuthService.login()` to reject non-REGISTERED_USER accounts

**File:** `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/application/AuthService.kt`

**Change:** In the `login()` method, after the existing `if (user.status != UserStatus.ACTIVE)` check (line 50-52), add a check that the user's `clientType` is `REGISTERED_USER`. If not, return `null` (which produces a 401, same as invalid credentials, to avoid leaking information).

Add after line 52:

```kotlin
if (user.clientType != ClientType.REGISTERED_USER) {
    return null
}
```

**Why:** Guest users and application users must not be able to use the login endpoint. Returning the same 401 as invalid credentials prevents information leakage about which logins exist.

---

### Step 4: Update `AuthService.login()` to include `displayName` in the `UserSummary`

**File:** `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/application/AuthService.kt`

**Change:** In the `LoginResponse` construction (lines 60-66), add `displayName = user.displayName` to the `UserSummary`:

```kotlin
user = UserSummary(
    id = user.id,
    login = user.login,
    displayName = user.displayName,
    clientType = user.clientType.name,
),
```

**Why:** The architecture specifies that the login response UserSummary includes `displayName`.

---

### Step 5: Update `AuthService.login()` to update `last_active_at` on successful login

**File:** `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/application/AuthService.kt`

**Change:** After password verification passes and before building the `LoginResponse`, call `userRepository.updateLastActiveAt(user.id)`. Insert this call after line 56 (after the password check block), before the token issuance:

```kotlin
userRepository.updateLastActiveAt(user.id)
```

**Why:** The architecture requires `last_active_at` to be updated on login. The `updateLastActiveAt()` method already exists in the repository (added in Task A).

---

### Step 6: Add `disableGuestsOlderThan()` to `UserRepository` interface

**File:** `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/persistence/UserRepository.kt`

**Change:** Add a new method to the interface:

```kotlin
fun disableGuestsOlderThan(retentionDays: Int): Int
```

Returns the count of rows updated.

**Why:** The guest archival job needs a repository method to disable old guest users. Returning the count allows the job to log how many were archived.

---

### Step 7: Implement `disableGuestsOlderThan()` in `JdbcUserRepository`

**File:** `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/persistence/JdbcUserRepository.kt`

**Change:** Add the implementation:

```kotlin
override fun disableGuestsOlderThan(retentionDays: Int): Int =
    jdbcTemplate.update(
        """UPDATE users
           SET status = 'DISABLED'
           WHERE client_type = 'GUEST_USER'
             AND status = 'ACTIVE'
             AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)""",
        retentionDays,
    )
```

**Why:** Targets only ACTIVE GUEST_USER accounts with `created_at` older than the retention period. Uses the existing `created_at` column from the original `001-create-users-table` migration. Returns affected row count.

---

### Step 8: Add `guest-retention-days` configuration to `application.yml`

**File:** `apps/users-service/src/main/resources/application.yml`

**Change:** Under the `app.security` section, add:

```yaml
    guest-retention-days: ${USERS_GUEST_RETENTION_DAYS:7}
```

This should be added after the existing `guest-token-expiration-seconds` line (line 45).

**Why:** Required configuration property for the guest archival job. Default of 7 days matches the architecture specification.

---

### Step 9: Add `guest-retention-days` to integration test configuration

**File:** `apps/users-service/src/test/resources/application-integration.yml`

**Change:** Under the `app.security` section, add:

```yaml
    guest-retention-days: 7
```

**Why:** Integration tests need this property resolved. Using a sensible default matching production.

---

### Step 10: Add `@EnableScheduling` to `UsersServiceApplication`

**File:** `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/UsersServiceApplication.kt`

**Change:** Add the `@EnableScheduling` annotation to the `UsersServiceApplication` class:

```kotlin
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class UsersServiceApplication
```

**Why:** Spring's `@Scheduled` annotation requires `@EnableScheduling` to be present on a configuration class. Without it, the cron-based guest archival job will not execute.

---

### Step 11: Create the `GuestArchivalJob` scheduled component

**File:** `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/application/GuestArchivalJob.kt` (NEW FILE)

**Change:** Create a new `@Component` with a `@Scheduled` method:

```kotlin
package com.agentic.restaurant.users.application

import com.agentic.restaurant.users.persistence.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class GuestArchivalJob(
    private val userRepository: UserRepository,
    @Value("\${app.security.guest-retention-days:7}") private val retentionDays: Int,
) {
    private val logger = LoggerFactory.getLogger(GuestArchivalJob::class.java)

    @Scheduled(cron = "\${app.security.guest-archival-cron:0 0 3 * * *}")
    fun archiveExpiredGuests() {
        logger.info("Starting guest user archival (retention: {} days)", retentionDays)
        val count = userRepository.disableGuestsOlderThan(retentionDays)
        logger.info("Guest user archival complete: {} guest(s) archived", count)
    }
}
```

**Why:** Architecture requires a daily scheduled job to set `status = DISABLED` on GUEST_USER accounts older than `guest-retention-days`. Default cron `0 0 3 * * *` runs daily at 3 AM. The cron is also configurable via property for testing flexibility. The job logs the count of archived guests as required.

---

### Step 12: Update OpenAPI spec -- extend `ValidateTokenResponse`

**File:** `apps/users-service/api/openapi.yaml`

**Change:** Add `clientType` and `displayName` properties to the `ValidateTokenResponse` schema (after the `expiresAt` property, around line 194):

```yaml
        clientType:
          type: string
          description: Client type of the token holder (REGISTERED_USER, GUEST_USER, APPLICATION). Defaults to REGISTERED_USER for legacy tokens.
          example: REGISTERED_USER
        displayName:
          type: string
          description: Display name of the user. Present for guest users (from JWT claim) and registered users with a display name (from database).
```

**Why:** Downstream consumers of the validation API need to know these fields exist. Keeps the OpenAPI spec in sync with the implementation.

---

### Step 13: Update existing integration test for login response to verify `clientType` and `displayName`

**File:** `apps/users-service/src/test/kotlin/com/agentic/restaurant/users/UsersServiceApplicationTests.kt`

**Change:** In the test `login endpoint authenticates admin default credentials`, add assertions for `clientType` and `displayName` in the user summary:

```kotlin
assertThat(user["clientType"]).isEqualTo("REGISTERED_USER")
assertThat(user["displayName"]).isEqualTo("admin")
```

Add these after the existing `assertThat(user["login"]).isEqualTo("admin")` line (line 116).

**Why:** Verifies the login response now includes `clientType` and `displayName` fields.

---

### Step 14: Update existing integration test for token validation to verify `clientType` and `displayName`

**File:** `apps/users-service/src/test/kotlin/com/agentic/restaurant/users/UsersServiceApplicationTests.kt`

**Change:** In the test `internal validation returns claims for valid token`, add assertions:

```kotlin
assertThat(response.body?.clientType).isEqualTo("REGISTERED_USER")
assertThat(response.body?.displayName).isEqualTo("admin")
```

Add these after the existing `assertThat(response.body?.roles).contains("ADMIN")` line (line 166).

**Why:** Verifies the validation response now includes `clientType` and `displayName`.

---

### Step 15: Add integration test -- login rejects guest user

**File:** `apps/users-service/src/test/kotlin/com/agentic/restaurant/users/UsersServiceApplicationTests.kt`

**Change:** Add a new test method. This test should:
1. Insert a guest user with a known password hash into the database via JDBC (using `client_type = 'GUEST_USER'`, `status = 'ACTIVE'`, and a bcrypt hash for a known password).
2. Attempt to login with those credentials.
3. Assert the response is 401 Unauthorized.
4. Clean up the inserted user.

```kotlin
@Test
fun `login endpoint rejects guest user`() {
    // Insert a guest user with a password (edge case: guest with password should still be rejected)
    jdbcTemplate.update(
        "INSERT INTO users (login, password_hash, status, roles, client_type, display_name) VALUES (?, ?, 'ACTIVE', 'CUSTOMER', 'GUEST_USER', ?)",
        "test-guest-login",
        passwordHasher.hash("guest-password"),
        "Test Guest",
    )
    try {
        val request = mapOf("login" to "test-guest-login", "password" to "guest-password")
        val response = restTemplate.postForEntity("/api/v1/auth/login", request, String::class.java)
        assertThat(response.statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
    } finally {
        jdbcTemplate.update("DELETE FROM users WHERE login = ?", "test-guest-login")
    }
}
```

Note: The coder must inject `PasswordHasher` as an `@Autowired` field in the test class for this test.

**Why:** Validates that the login endpoint correctly rejects non-REGISTERED_USER accounts.

---

### Step 16: Add integration test -- login updates `last_active_at`

**File:** `apps/users-service/src/test/kotlin/com/agentic/restaurant/users/UsersServiceApplicationTests.kt`

**Change:** Add a new test method:
1. Confirm admin's `last_active_at` is either null or record the current value.
2. Call login for admin.
3. Assert login succeeds.
4. Query the database and assert `last_active_at` is now non-null and recent.

```kotlin
@Test
fun `login updates last_active_at`() {
    val response = restTemplate.postForEntity(
        "/api/v1/auth/login",
        mapOf("login" to "admin", "password" to "admin"),
        Map::class.java,
    )
    assertThat(response.statusCode).isEqualTo(HttpStatus.OK)

    val lastActiveAt = jdbcTemplate.queryForObject(
        "SELECT last_active_at FROM users WHERE login = 'admin'",
        java.sql.Timestamp::class.java,
    )
    assertThat(lastActiveAt).isNotNull()
}
```

**Why:** Validates that `last_active_at` is updated on successful login.

---

### Step 17: Add integration test -- backward compatibility for tokens without `clientType` claim

**File:** `apps/users-service/src/test/kotlin/com/agentic/restaurant/users/UsersServiceApplicationTests.kt`

**Change:** Add a new test method that:
1. Manually constructs a JWT without the `clientType` claim (using the jjwt library directly, or by using a helper that builds a minimal token).
2. Validates it via the internal validation endpoint.
3. Asserts that `clientType` is `REGISTERED_USER` (the default) and `valid` is `true`.

The coder should build a legacy token by directly using `Jwts.builder()` with only `sub`, `login`, `roles`, `iat`, and `exp` claims (no `clientType`), signing with the same secret.

```kotlin
@Test
fun `validation defaults clientType to REGISTERED_USER for legacy tokens`() {
    val user = userRepository.findByLogin("admin")!!
    // Build a token without clientType claim to simulate legacy token
    val legacyToken = buildLegacyToken(user)

    val headers = HttpHeaders()
    headers.contentType = MediaType.APPLICATION_JSON
    headers["X-Service-Token"] = "integration-service-token"
    val entity = HttpEntity(ValidateTokenRequest(legacyToken), headers)

    val response = restTemplate.postForEntity(
        "/api/v1/internal/auth/validate",
        entity,
        ValidateTokenResponse::class.java,
    )

    assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
    assertThat(response.body?.valid).isTrue()
    assertThat(response.body?.clientType).isEqualTo("REGISTERED_USER")
    assertThat(response.body?.login).isEqualTo("admin")
}
```

The `buildLegacyToken()` helper should be a private method in the test class that uses `Jwts.builder()` directly with the test signing key, omitting the `clientType` claim. The coder can either inject the JWT secret and build the key, or add a method to `JwtTokenService` for testing purposes. The simplest approach is to add a `private fun` in the test that builds a token using the known `integration-test-jwt-secret-key-0123456789` from the test config.

**Why:** This is a critical backward compatibility requirement -- old tokens without `clientType` must still validate and default to `REGISTERED_USER`.

---

### Step 18: Add integration test -- guest archival job

**File:** `apps/users-service/src/test/kotlin/com/agentic/restaurant/users/UsersServiceApplicationTests.kt`

**Change:** Add a new test method that:
1. Inject `GuestArchivalJob` as an `@Autowired` field.
2. Insert a GUEST_USER with `created_at` set to 10 days ago (older than 7-day retention).
3. Insert another GUEST_USER with `created_at` set to NOW (within retention).
4. Call `guestArchivalJob.archiveExpiredGuests()` directly (bypassing the scheduler).
5. Assert the old guest is now DISABLED.
6. Assert the recent guest is still ACTIVE.
7. Clean up.

```kotlin
@Test
fun `guest archival disables guests older than retention period`() {
    // Insert an old guest (created 10 days ago)
    jdbcTemplate.update(
        "INSERT INTO users (login, password_hash, status, roles, client_type, display_name, created_at) VALUES (?, NULL, 'ACTIVE', 'CUSTOMER', 'GUEST_USER', ?, DATE_SUB(NOW(), INTERVAL 10 DAY))",
        "test-old-guest",
        "Old Guest",
    )
    // Insert a recent guest
    jdbcTemplate.update(
        "INSERT INTO users (login, password_hash, status, roles, client_type, display_name) VALUES (?, NULL, 'ACTIVE', 'CUSTOMER', 'GUEST_USER', ?)",
        "test-recent-guest",
        "Recent Guest",
    )
    try {
        guestArchivalJob.archiveExpiredGuests()

        val oldStatus = jdbcTemplate.queryForObject(
            "SELECT status FROM users WHERE login = 'test-old-guest'",
            String::class.java,
        )
        assertThat(oldStatus).isEqualTo("DISABLED")

        val recentStatus = jdbcTemplate.queryForObject(
            "SELECT status FROM users WHERE login = 'test-recent-guest'",
            String::class.java,
        )
        assertThat(recentStatus).isEqualTo("ACTIVE")
    } finally {
        jdbcTemplate.update("DELETE FROM users WHERE login IN ('test-old-guest', 'test-recent-guest')")
    }
}
```

**Why:** Validates the guest archival logic correctly disables only guests older than the retention period and leaves recent guests untouched.

---

## Tests

### Updated Existing Tests
1. **`login endpoint authenticates admin default credentials`** -- add assertions for `clientType` and `displayName` in user summary (Step 13)
2. **`internal validation returns claims for valid token`** -- add assertions for `clientType` and `displayName` (Step 14)

### New Tests
3. **`login endpoint rejects guest user`** -- login with GUEST_USER credentials returns 401 (Step 15)
4. **`login updates last_active_at`** -- verify `last_active_at` column is updated after login (Step 16)
5. **`validation defaults clientType to REGISTERED_USER for legacy tokens`** -- token without `clientType` claim validates with default (Step 17)
6. **`guest archival disables guests older than retention period`** -- scheduled job disables old guests, leaves recent guests (Step 18)

### Test Infrastructure Changes
- Inject `PasswordHasher` in test class (for Step 15)
- Inject `GuestArchivalJob` in test class (for Step 18)
- Add `buildLegacyToken()` private helper method in test class (for Step 17)

## Domain Documentation Updates

### `domain-brain/entities/access-token.md`
- Add `clientType` and `displayName` to canonical fields
- Add note about token lifetime variation (1h registered/application, 24h guest)
- Add backward compatibility note (tokens without `clientType` default to REGISTERED_USER)

### `domain-brain/flows/user-authentication.md`
- Add note that login rejects non-REGISTERED_USER accounts
- Add note about `last_active_at` being updated on login
- Add section on guest user archival (daily scheduled job, configurable retention)

### `domain-brain/entities/user-account.md`
- Add `clientType`, `displayName`, `applicationId`, `lastActiveAt` to canonical fields (if not already added by Tasks A/B/C; verify before updating)
- Add note about guest archival lifecycle

Note: These documentation updates are lightweight additions. The full documentation overhaul is Task G. Only add notes directly relevant to Task D changes.

## Open Questions

None. All design decisions were resolved in the architecture document (section 14).
