# Architecture Design

## 1. Task Summary

Extend the users-service to support three distinct client types (RegisteredUser, GuestUser, Application), enable guest access for restaurant terminal users without full registration, and replace the static `X-Service-Token` mechanism with proper JWT-based application authentication across all services.

## 2. Problem Statement

The current system requires full registration (login + password) to access menu browsing and order submission. This is a blocker for restaurant terminal scenarios where walk-in customers should be able to enter their name and immediately start ordering.

Additionally, the current service-to-service authentication uses static shared secrets via `X-Service-Token` headers. This provides no identity, no expiry, no auditability, and no per-instance distinction. Replacing this with JWT-based application authentication gives each service instance a trackable identity and time-bounded credentials.

The architectural challenge is threefold:

1. Introduce user type polymorphism into a system designed for a single user type, without breaking existing flows.
2. Design a guest user lifecycle that is simple for terminal UX but secure enough for production.
3. Design an application token pool that handles concurrent service scaling without race conditions.

## 3. Affected Domain Flows

All three existing flows are affected:

- **`user_authentication`** -- New authentication paths for guest users and application services. New endpoints, new token lifetimes, new user creation flows.
- **`menu_browsing`** -- Guest users must be able to browse the menu. The menu-service itself authenticates as an Application user instead of using static tokens.
- **`order_submission`** -- Guest users must be able to submit orders. The orders-service authenticates as an Application user. Token validation responses now include `clientType`.

Supporting domain references:

- `domain-brain/flows/user-authentication.md`
- `domain-brain/flows/menu-browsing.md`
- `domain-brain/flows/order-submission.md`
- `domain-brain/entities/user-account.md`
- `domain-brain/entities/access-token.md`
- `domain-brain/invariants.md`
- `domain-brain/glossary.md`

## 4. Constraints

- `users-service` remains Kotlin / Spring Boot 3.x / MySQL / Liquibase / JDBC (no JPA).
- `menu-service` remains Java 21 / Spring Boot 3.x / MongoDB.
- `orders-service` remains Kotlin / Spring Boot 3.x / MySQL / Liquibase / JDBC.
- `orders-client` remains React / TypeScript / Vite.
- No Spring Security framework in any service (all auth is hand-coded at the application level).
- JWT signing uses HMAC-SHA via jjwt library; the secret is known only to users-service.
- Token validation remains centralized in users-service (other services do not validate JWTs locally).
- Existing registered user login flow must continue to work identically.
- Existing seed data (6 users) must remain functional.
- Database migrations must be additive (no destructive changes to existing columns).
- All new backend services must be Go, but this task only modifies existing Java/Kotlin services.

## 5. Proposed Architecture

### 5.1 Client Type Model

Introduce a `client_type` enum with three values:

| ClientType | Description | Auth Mechanism | Token Lifetime |
|---|---|---|---|
| `REGISTERED_USER` | Human with login + password | Login with credentials | 1 hour (unchanged) |
| `GUEST_USER` | Walk-in customer at a terminal | Created on demand with display name | 24 hours |
| `APPLICATION` | Backend service instance | Application name + secret, pool-managed | 1 hour |

All three types produce a standard JWT with the same structure. Downstream services do not need to differentiate -- they validate the token through users-service and get back validity + userId + roles + clientType. The `clientType` is informational; authorization logic remains role-based.

### 5.2 Guest User Flow

```
Terminal User                orders-client              users-service
     |                           |                           |
     |-- enters name ----------->|                           |
     |                           |-- POST /auth/guests ----->|
     |                           |   {displayName: "John"}   |
     |                           |   Authorization: Bearer   |
     |                           |   <orders-client-app-JWT> |
     |                           |                           |-- create GuestUser
     |                           |                           |   login: guest-{uuid}
     |                           |                           |   display_name: "John"
     |                           |                           |   client_type: GUEST_USER
     |                           |                           |   status: ACTIVE
     |                           |                           |-- issue 24h JWT
     |                           |<-- {accessToken, user} ---|
     |                           |                           |
     |<-- show menu screen ------|                           |
     |                           |                           |
     |-- browse/order ---------->|-- GET /menu-items ------->| (using guest JWT)
                                 |-- PUT /orders/{id} ------>| (using guest JWT)
```

Key design decisions:

- **Guest creation requires an authenticated Application caller.** The `POST /api/v1/auth/guests` endpoint requires a valid Application JWT in the `Authorization` header. This prevents anonymous abuse -- only registered terminal applications can create guests.
- **Guest login is a unique synthetic identifier.** Format: `guest-{uuid}`. This satisfies the UNIQUE constraint on the `login` column without requiring the guest to choose a username.
- **Guest display name has no uniqueness constraint.** Multiple guests can be "John".
- **Guest users have no password.** The `password_hash` column becomes nullable. For guest users it is NULL.
- **Guest tokens are not refreshable.** When a 24-hour token expires, the terminal shows the guest entry screen again. This is intentional -- guest sessions should be transient.
- **Guest users are archived after 7 days.** A scheduled cleanup job in users-service sets `status = DISABLED` on guest users where `created_at` is older than the configurable retention period (default: 7 days, via `app.security.guest-retention-days`). Disabled guests remain in the database for order history purposes but can no longer authenticate.
- **Guest users get the `CUSTOMER` role.** They have the same permissions as registered customers for menu browsing and order submission.

### 5.3 Application Authentication Flow

```
Service Instance              users-service
     |                              |
     |-- POST /auth/applications/   |
     |   token                      |
     |   {applicationName: "menu-   |
     |    service",                  |
     |    applicationSecret: "..."}  |
     |                              |-- find application by name
     |                              |-- verify secret
     |                              |-- find or create pool user
     |                              |-- issue 1h JWT for pool user
     |<-- {accessToken, user,       |
     |     expiresInSeconds} -------|
     |                              |
     | (before expiry)              |
     |-- POST /auth/applications/   |
     |   token  (same request) ---->|-- recycle: same pool user
     |<-- {new accessToken} --------|
```

Key design decisions:

- **Application records are seeded via Liquibase**, not self-registered. Each application gets a row in a new `applications` table with: `id`, `application_name` (unique), `secret_hash` (PBKDF2, same as passwords), `max_pool_size` (default 30, configurable per application), `status` (ACTIVE/DISABLED), `created_at`.
- **Pool users are created lazily in the `users` table.** When an application requests a token and no inactive pool user is available, a new user is created (up to `max_pool_size`). The user's `login` is `app-{applicationName}-{sequenceNumber}` (e.g., `app-menu-service-1`), `client_type` is `APPLICATION`, role is `SERVICE`.
- **Pool user acquisition is atomic.** The query to find the oldest inactive pool user and mark it active runs as a single transaction with `SELECT ... FOR UPDATE` to prevent race conditions when multiple instances start simultaneously.
- **Inactive means `last_active_at` is older than 10 minutes.** This is configurable via `app.security.application-inactive-threshold-minutes` (default: 10).
- **Token refresh is just another token request.** Services call the same `POST /auth/applications/token` endpoint before their current token expires. If the service still holds a valid token and its pool user is still assigned, it gets a fresh token for the same pool user. This is not a distinct "refresh" mechanism -- it's a re-acquisition.
- **Service role `SERVICE`** is distinct from `CUSTOMER`, `MANAGER`, and `ADMIN`. This allows downstream services to check `clientType` or role if they ever need to distinguish service-initiated requests from user-initiated ones.

### 5.4 Application Token Pool Mechanics

```
applications table                    users table (pool users)
+----+----------------+--------+     +----+---------------------+-----------+----------+----------------+
| id | application_name| max   |     | id | login               | client_type| app_id  | last_active_at |
+----+----------------+--------+     +----+---------------------+-----------+----------+----------------+
| 1  | orders-client  | 30     |     | .. | app-orders-client-1 | APPLICATION| 1       | 2026-03-12 10:00|
| 2  | menu-service   | 30     |     | .. | app-orders-client-2 | APPLICATION| 1       | NULL (inactive) |
| 3  | orders-service | 30     |     | .. | app-menu-service-1  | APPLICATION| 2       | 2026-03-12 10:05|
+----+----------------+--------+     +----+---------------------+-----------+----------+----------------+
```

Acquisition algorithm:

1. Authenticate: Look up application by `application_name`, verify `secret_hash`, check status is `ACTIVE`.
2. Find available pool user: `SELECT * FROM users WHERE application_id = ? AND client_type = 'APPLICATION' AND (last_active_at IS NULL OR last_active_at < NOW() - INTERVAL ? MINUTE) ORDER BY last_active_at ASC NULLS FIRST LIMIT 1 FOR UPDATE`.
3. If found: update `last_active_at = NOW()`, `status = ACTIVE`, issue JWT for this user.
4. If not found: check current pool count. If count < `max_pool_size`, create a new pool user, issue JWT. If count >= `max_pool_size`, return `503 Service Unavailable` (all pool slots occupied by active instances).

### 5.5 Replacing X-Service-Token with JWT

Currently, inter-service calls use a static `X-Service-Token` header. This changes to:

| Before | After |
|---|---|
| `X-Service-Token: local-dev-token` | `Authorization: Bearer <application-JWT>` |
| Static, shared, no expiry | Per-instance, time-bounded, auditable |
| Validated by string equality | Validated through the same `POST /internal/auth/validate` flow |

The internal validation endpoint (`POST /api/v1/internal/auth/validate`) itself needs a bootstrap path. Since it's the endpoint that validates JWTs, it cannot require a JWT to access. The solution:

- **The internal validation endpoint retains a service-token guard**, but this is now a dedicated internal-only secret used exclusively for the validate endpoint. It is NOT the same as application authentication.
- Alternatively, the validation endpoint could accept either a service-token OR a valid application JWT. But keeping the simple service-token for this one internal endpoint avoids a circular dependency (you need to validate a JWT to call the endpoint that validates JWTs).

**Decision:** Keep the `X-Service-Token` mechanism for the `/api/v1/internal/auth/validate` endpoint only. All other inter-service endpoints (e.g., menu-service's `/api/v1/internal/menu-items/resolve` and any future internal endpoints) switch to `Authorization: Bearer <application-JWT>`.

For the public-facing endpoints (`GET /api/v1/menu-items`, `PUT /api/v1/orders/{requestId}`), nothing changes -- they already accept `Authorization: Bearer` tokens and validate them through users-service. Now those tokens can belong to any client type (registered, guest, or application).

### 5.6 orders-client Changes

The orders-client home screen gets two entry points:

```
+----------------------------------+
|     Welcome to Restaurant        |
|                                  |
|  [    Login (Registered)    ]    |
|                                  |
|  [   Continue as Guest      ]    |
|                                  |
+----------------------------------+
```

**"Login (Registered)"** -- Uses the existing `POST /api/v1/auth/login` flow. No changes.

**"Continue as Guest"** -- Shows a simple name input field. On submit:
1. orders-client uses its **application token** to call `POST /api/v1/auth/guests` with `{ "displayName": "John" }`.
2. Receives a guest JWT + user summary.
3. Stores the guest JWT in `sessionStorage` (same mechanism as registered login).
4. Proceeds to the menu screen.

**Application token management in orders-client:**
- Each frontend deployment (one Nginx instance serving the SPA) consumes exactly 1 application token from the pool. If 5 browser tabs (terminals) use the same frontend deployment, they all share that single Application JWT.
- On startup (or page load), orders-client checks if it has a valid application token cached in memory (not sessionStorage -- this is an app-level concern, not a user session).
- If no valid app token exists, it calls `POST /api/v1/auth/applications/token` with credentials from environment variables (`VITE_APP_NAME`, `VITE_APP_SECRET`).
- The app token is stored in a module-scoped variable (JavaScript module scope), not in the browser storage.
- A timer is set to refresh the app token before expiry (e.g., at 80% of `expiresInSeconds`).
- The app token is only used for the guest creation endpoint. All user-facing API calls use the user's own JWT (registered or guest).

**Note on browser-side app tokens:** Since the SPA runs in the browser, the application token is technically exposed to the browser. This is acceptable because: (a) the app token can only create guest users -- it cannot access menu or orders directly, (b) guest users are low-privilege (CUSTOMER role only), (c) the real security boundary is the guest JWT, not the application token. The application token serves as a gatekeeper to prevent unauthenticated guest creation, not as a high-security secret.

### 5.7 Backend Service Startup Auth

For menu-service and orders-service:

1. On application startup (Spring `@EventListener(ApplicationReadyEvent)` or `CommandLineRunner`), the service calls `POST /api/v1/auth/applications/token` with its application name and secret (from config).
2. Stores the received JWT in memory.
3. Schedules a refresh before expiry (e.g., using `@Scheduled` or a `ScheduledExecutorService`).
4. Uses this JWT as `Authorization: Bearer` for calls to other services' internal endpoints (e.g., orders-service calling menu-service's resolve endpoint).
5. If token acquisition fails at startup, the service logs a warning and retries with exponential backoff. The service can still start (health check passes), but authenticated outbound calls will fail until a token is acquired.

The `X-Service-Token` header is removed from all inter-service calls EXCEPT calls to `POST /api/v1/internal/auth/validate` (which retains its dedicated service-token guard to avoid circular dependency).

### 5.8 Token Claim Changes

Current JWT claims:

```json
{
  "sub": "1001",
  "login": "alex.customer",
  "roles": ["CUSTOMER"],
  "iat": 1741776000,
  "exp": 1741779600
}
```

New JWT claims (additive):

```json
{
  "sub": "1001",
  "login": "alex.customer",
  "roles": ["CUSTOMER"],
  "clientType": "REGISTERED_USER",
  "iat": 1741776000,
  "exp": 1741779600
}
```

The `clientType` claim is added to all tokens. This allows downstream services to know the type of caller without an extra lookup, if needed in the future.

For guest users:

```json
{
  "sub": "5001",
  "login": "guest-a1b2c3d4",
  "roles": ["CUSTOMER"],
  "clientType": "GUEST_USER",
  "displayName": "John",
  "iat": 1741776000,
  "exp": 1741862400
}
```

For application users:

```json
{
  "sub": "9001",
  "login": "app-menu-service-1",
  "roles": ["SERVICE"],
  "clientType": "APPLICATION",
  "iat": 1741776000,
  "exp": 1741779600
}
```

## 6. Components Affected

### 6.1 users-service

| Component | Change |
|---|---|
| `domain/UserAccount.kt` | Add `clientType`, `displayName`, `applicationId`, `lastActiveAt` fields. Add `ClientType` enum. |
| `persistence/UserRepository.kt` | New methods: `findByApplicationIdAndInactive()`, `countByApplicationId()`, `updateLastActiveAt()` |
| `persistence/JdbcUserRepository.kt` | Implement new repository methods with `FOR UPDATE` locking |
| `application/AuthService.kt` | New methods: `createGuestUser()`, `acquireApplicationToken()`. Modify `validateToken()` to return `clientType`. |
| `api/AuthController.kt` | Two new endpoints: `POST /api/v1/auth/guests`, `POST /api/v1/auth/applications/token` |
| `api/AuthDtos.kt` | New DTOs for guest creation and application token requests/responses |
| `security/JwtTokenService.kt` | Add `clientType` claim to token issuance. Support configurable expiration per token type. |
| `domain/Application.kt` | New entity: `Application` (id, applicationName, secretHash, maxPoolSize, status, createdAt) |
| `persistence/ApplicationRepository.kt` | New repository for the `applications` table |
| DB migration `004-*` | Add `client_type`, `display_name`, `application_id`, `last_active_at` columns to `users`. Make `password_hash` nullable. Backfill `client_type` as `REGISTERED_USER`. |
| DB migration `005-*` | Create `applications` table. Seed application records for orders-client, menu-service, orders-service. |
| DB migration `006-*` | Remove demo customer/manager seed users (keep only admin). Update admin user with `client_type` and `display_name`. |
| `application.yml` | New config: `app.security.guest-token-expiration-seconds`, `app.security.application-inactive-threshold-minutes` |
| `api/openapi.yaml` | Add new endpoints and DTOs |

### 6.2 orders-client

| Component | Change |
|---|---|
| `src/shared/api/config.ts` | Add app name and secret config from env vars |
| `src/features/auth/api.ts` | New functions: `acquireAppToken()`, `createGuestUser()` |
| `src/features/auth/session.ts` | Extend session type to include `clientType` |
| `src/features/auth/appToken.ts` | New module: application token management (acquire, cache, auto-refresh) |
| `src/App.tsx` | Split home screen into registered login vs guest login. Wire guest flow. |
| `.env.example` | Add `VITE_APP_NAME`, `VITE_APP_SECRET` |
| `nginx.conf` | Add proxy rule for new auth endpoints |

### 6.3 menu-service

| Component | Change |
|---|---|
| `application/AuthValidationClient.java` | No change (still calls validate endpoint with X-Service-Token) |
| `api/InternalMenuController.java` | Switch from `X-Service-Token` check to JWT Bearer validation for the resolve endpoint |
| `application/StartupAuthClient.java` | New: acquires application JWT on startup, schedules refresh |
| `application.yml` | Add `app.auth.application-name`, `app.auth.application-secret`. Remove `app.security.internal-service-token` usage for resolve endpoint. |

### 6.4 orders-service

| Component | Change |
|---|---|
| `clients/AuthValidationClient.kt` | No change (still calls validate endpoint with X-Service-Token) |
| `clients/MenuLookupClient.kt` | Switch from `X-Service-Token` to `Authorization: Bearer <app-JWT>` for menu resolve calls |
| `application/StartupAuthClient.kt` | New: acquires application JWT on startup, schedules refresh |
| `application/OrderSubmissionService.kt` | Extract `displayName` from token validation response, pass to persistence |
| `persistence/OrderPersistence.kt` | Store `user_display_name` on order insert |
| `api/OrderDtos.kt` | Add `userDisplayName` to `SubmitOrderResponse` |
| DB migration (orders-service) | Add nullable `user_display_name VARCHAR(255)` column to `orders` table |
| `application.yml` | Add `app.auth.application-name`, `app.auth.application-secret` |

### 6.5 Infrastructure

| Component | Change |
|---|---|
| `docker-compose.yml` | Add environment variables for application secrets for all services |
| `infra/mysql/init-databases.sql` | No change (users_db already exists) |

## 7. Data Model / Ownership

### 7.1 Modified Table: `users`

New columns (additive migration, no existing columns changed):

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `client_type` | `VARCHAR(32)` | NOT NULL | `'REGISTERED_USER'` | Backfill existing rows as REGISTERED_USER |
| `display_name` | `VARCHAR(255)` | NULL | NULL | Human-readable name; required for GUEST_USER |
| `application_id` | `BIGINT` | NULL | NULL | FK to `applications.id`; set only for APPLICATION users |
| `last_active_at` | `TIMESTAMP` | NULL | NULL | Updated on login, token validation, or token acquisition |

Modified columns:

| Column | Change | Reason |
|---|---|---|
| `password_hash` | Change from `NOT NULL` to `NULL` | Guest users have no password |

### 7.2 New Table: `applications`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `application_name` | `VARCHAR(255)` | NOT NULL, UNIQUE | e.g., "orders-client", "menu-service" |
| `secret_hash` | `VARCHAR(255)` | NOT NULL | PBKDF2 hash, same format as user passwords |
| `max_pool_size` | `INT` | NOT NULL, default 30 | Configurable per application |
| `status` | `VARCHAR(32)` | NOT NULL | ACTIVE / DISABLED |
| `created_at` | `TIMESTAMP` | NOT NULL, default CURRENT_TIMESTAMP | |

### 7.3 Seed Data Changes

**Users table cleanup:** The existing seed data (changesets `002-seed-users` and `003-seed-admin-user`) seeds 5 demo customer/manager users plus 1 admin user. As part of this task, the 5 demo users (alex.customer, nina.customer, sam.customer, olga.manager, disabled.user) are removed. Only the `admin` / `admin` user is retained. A new migration deletes these demo rows (or the seed changeset is replaced). The admin user is updated to include `client_type = REGISTERED_USER` and `display_name = admin`.

With guest access, demo customer users are no longer needed -- guests can be created on demand at the terminal, and registered users can be created through future admin functionality.

**Applications table seed:** Seeded via Liquibase migration with local-dev defaults:

| application_name | max_pool_size | status | secret (pre-hash) |
|---|---|---|---|
| `orders-client` | 30 | ACTIVE | `orders-client-secret` (local dev default) |
| `menu-service` | 30 | ACTIVE | `menu-service-secret` (local dev default) |
| `orders-service` | 30 | ACTIVE | `orders-service-secret` (local dev default) |

Application secrets in the `applications` table are PBKDF2 hashes of the local-dev defaults above. Each backend service receives its matching plaintext secret via environment variable (e.g., `APP_AUTH_SECRET=menu-service-secret` in docker-compose.yml). Production deployments override both the environment variables and the database hashes.

### 7.4 Entity Ownership

- `applications` table: owned exclusively by users-service.
- `users` table: owned exclusively by users-service. The new `application_id` FK references `applications` within the same database.
- No other service reads or writes to these tables.

### 7.5 Updated Domain Entity

```kotlin
data class UserAccount(
    val id: Long,
    val login: String,
    val passwordHash: String?,          // nullable for GUEST_USER
    val status: UserStatus,
    val roles: List<String>,
    val clientType: ClientType,         // new
    val displayName: String?,           // new
    val applicationId: Long?,           // new, for APPLICATION users
    val lastActiveAt: Instant?,         // new
)

enum class ClientType {
    REGISTERED_USER,
    GUEST_USER,
    APPLICATION,
}

data class Application(
    val id: Long,
    val applicationName: String,
    val secretHash: String,
    val maxPoolSize: Int,
    val status: ApplicationStatus,
    val createdAt: Instant,
)

enum class ApplicationStatus {
    ACTIVE,
    DISABLED,
}
```

## 8. Interfaces

### 8.1 New Endpoint: Create Guest User

```
POST /api/v1/auth/guests
Authorization: Bearer <application-JWT>
Content-Type: application/json

Request:
{
  "displayName": "John"
}

Response 201 Created:
{
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresInSeconds": 86400,
  "user": {
    "id": 5001,
    "login": "guest-a1b2c3d4",
    "displayName": "John",
    "clientType": "GUEST_USER"
  }
}

Response 401 Unauthorized:
  (missing or invalid application token)

Response 403 Forbidden:
  (caller is not an APPLICATION user)

Response 400 Bad Request:
  (displayName blank or missing)
```

Authorization rule: the caller's JWT must be valid AND the caller's `clientType` must be `APPLICATION`. This prevents registered users or other guests from creating guest accounts.

### 8.2 New Endpoint: Acquire Application Token

```
POST /api/v1/auth/applications/token
Content-Type: application/json

Request:
{
  "applicationName": "menu-service",
  "applicationSecret": "menu-service-secret"
}

Response 200 OK:
{
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresInSeconds": 3600,
  "user": {
    "id": 9001,
    "login": "app-menu-service-1",
    "clientType": "APPLICATION"
  }
}

Response 401 Unauthorized:
  (application not found or secret incorrect)

Response 403 Forbidden:
  (application is DISABLED)

Response 503 Service Unavailable:
  (all pool slots occupied by active instances)
```

This endpoint requires NO prior authentication (it IS the authentication step for applications). The application name + secret serve as credentials, analogous to login + password for registered users.

### 8.3 Modified Endpoint: Validate Token

```
POST /api/v1/internal/auth/validate
X-Service-Token: <internal-service-token>
Content-Type: application/json

Request (unchanged):
{
  "token": "eyJ..."
}

Response 200 OK (extended):
{
  "valid": true,
  "userId": 1001,
  "login": "alex.customer",
  "roles": ["CUSTOMER"],
  "clientType": "REGISTERED_USER",
  "displayName": "Alex",
  "expiresAt": "2026-03-12T11:00:00Z"
}
```

Changes: adds `clientType` and `displayName` to the response. Existing fields unchanged.

### 8.4 Modified Endpoint: Login (Registered User)

```
POST /api/v1/auth/login
Content-Type: application/json

Request (unchanged):
{
  "login": "alex.customer",
  "password": "alex123!"
}

Response 200 OK (extended):
{
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresInSeconds": 3600,
  "user": {
    "id": 1001,
    "login": "alex.customer",
    "displayName": "Alex",
    "clientType": "REGISTERED_USER"
  }
}
```

Changes: `UserSummary` gains `displayName` and `clientType`. Login endpoint now also updates `last_active_at`. Login rejects non-REGISTERED_USER accounts (guests and applications cannot use this endpoint).

### 8.5 Internal Menu Resolve Endpoint (Auth Change)

```
POST /api/v1/internal/menu-items/resolve
Authorization: Bearer <application-JWT>          <-- changed from X-Service-Token
Content-Type: application/json

Request (unchanged):
{
  "ids": [10000000001, 10000000002]
}
```

The menu-service now validates the Bearer token through users-service (same flow as public endpoints) instead of checking a static service token. The caller must have `clientType: APPLICATION`.

### 8.6 Order Submission -- Guest Display Name

Orders must display the guest's id and display name. To achieve this without orders-service needing to call users-service for name resolution:

- The `ValidateTokenResponse` already includes `userId`, `login`, and `displayName` (from section 8.3).
- orders-service extracts `displayName` from the token validation response and stores it on the order record.
- A new nullable `user_display_name` column is added to the `orders` table. For registered users this holds their `login` (or `displayName` if set). For guest users this holds their entered name.

Modified order submission flow inside orders-service:
1. Validate bearer token via users-service (existing).
2. Extract `userId` and `displayName` from the validation response (new).
3. Store `user_display_name` alongside `user_id` in the order record (new).

The `SubmitOrderResponse` returned to orders-client is extended with `userDisplayName`:

```json
{
  "orderId": 1,
  "requestId": "abc-123",
  "status": "ACCEPTED",
  "totalAmount": 33.60,
  "userId": 5001,
  "userDisplayName": "John"
}
```

orders-client displays both the user id and display name in the order confirmation UI.

## 9. Reliability / Performance Considerations

### 9.1 Token Validation Remains Centralized

Every authenticated request still requires a synchronous call to users-service for token validation. This is unchanged from the current architecture. The users-service is a single point of failure for all authenticated traffic. This is an accepted trade-off for the current scale, documented in the original architecture.

Adding guest users and application users increases the volume of tokens being validated, but the validation logic itself doesn't change -- it's still a JWT parse + DB lookup. The performance impact is proportional to the number of concurrent users, not the number of user types.

### 9.2 Application Token Pool -- Concurrency

The pool acquisition uses `SELECT ... FOR UPDATE` within a transaction. This serializes concurrent token requests for the same application. At the expected scale (single-digit service instances per application), this is not a bottleneck. The lock is held only for the duration of the SELECT + UPDATE (microseconds).

If pool contention becomes an issue at larger scale, the mitigation is to increase `max_pool_size` or switch to an optimistic locking pattern with retry.

### 9.3 Guest User Volume and Cleanup

In a busy restaurant with multiple terminals, guest user creation could produce hundreds of rows per day. These are lightweight (no password hash computation) and the creation path is simple (INSERT + JWT issuance).

A scheduled cleanup job in users-service must archive guest users older than 7 days (configurable via `app.security.guest-retention-days`, default: 7). Archival means setting `status = DISABLED` on guest user records where `created_at` is older than the retention period. The job runs daily (e.g., via `@Scheduled` with a cron expression). Disabled guest users remain in the database for audit/order history purposes but their tokens will be rejected on validation (existing behavior: disabled users fail validation).

This is in scope for this task.

### 9.4 Service Startup Resilience

If users-service is not yet available when menu-service or orders-service starts, the application token acquisition will fail. Services must:

1. Retry with exponential backoff (e.g., 1s, 2s, 4s, 8s, max 30s).
2. Not block the startup process -- the service should become healthy for readiness probes even without a token.
3. Fail outbound authenticated calls gracefully until a token is acquired.

This is important for Docker Compose startup ordering. The `depends_on: service_healthy` constraint helps but doesn't guarantee users-service is fully ready to serve requests by the time dependents start making calls.

### 9.5 Token Refresh Timing

Application services should refresh their token at 80% of the expiration window (e.g., at 48 minutes for a 60-minute token). This provides a 12-minute buffer for transient failures. If refresh fails, the service retries with exponential backoff. The old token remains valid until actual expiry.

### 9.6 Last Active At Updates

Updating `last_active_at` on every token validation would add a write to every authenticated request -- this is too expensive. Instead:

- `last_active_at` is updated on: login, guest creation, application token acquisition, and application token refresh.
- It is NOT updated on every token validation call. The 10-minute inactivity threshold for application pool reclamation is based on token acquisition time, not request time.
- This means an application instance is considered "inactive" if it hasn't refreshed its token in 10 minutes. Since tokens are refreshed at the 80% mark (48 minutes), and the inactivity threshold is 10 minutes, an instance that crashes will have its pool slot reclaimed after 10 minutes regardless of when it last refreshed. To make this work correctly, the `last_active_at` should also be updated via a lightweight heartbeat mechanism OR the threshold should be set relative to the token expiry (e.g., "inactive if token has expired"). 

**Revised decision:** An application pool user is considered inactive if its `last_active_at` is older than `app.security.application-inactive-threshold-minutes` (default: 10). Services must send a heartbeat by re-calling the token endpoint periodically (recommended: every 5 minutes). This is simpler than a dedicated heartbeat endpoint and reuses existing infrastructure. The re-call either returns the same token (if still valid) or a refreshed one.

## 10. Security / Integrity Considerations

### 10.1 Trust Boundaries

```
                    UNTRUSTED                          TRUSTED
                    ─────────                          ───────
Browser (guest/     │          orders-client           │
registered user)    │          (Application)           │
                    │               │                  │
                    │    ┌──────────┴──────────┐       │
                    │    │                     │       │
                    │  menu-service    orders-service  │
                    │  (Application)   (Application)   │
                    │         │              │         │
                    │         └──────┬───────┘         │
                    │                │                 │
                    │         users-service            │
                    │         (token authority)        │
```

- Browser requests are untrusted. All tokens from browsers are validated on every request.
- Application-to-application requests use JWT tokens that are validated through users-service.
- The `POST /api/v1/internal/auth/validate` endpoint is the single trust anchor. It retains its `X-Service-Token` guard because it cannot depend on the system it validates.

### 10.2 Guest User Abuse Prevention

- Guest creation requires an Application JWT. Random internet clients cannot create guests by calling the endpoint directly.
- Guest tokens expire in 24 hours (configurable). No refresh mechanism prevents indefinite sessions.
- Guest users are archived (disabled) after 7 days (configurable).
- Guest users have `CUSTOMER` role only -- no elevated permissions.
- The `displayName` field should be sanitized (max length, no HTML/script injection) at the DTO validation level.
- Display name maximum length: 100 characters. Validated with `@Size(max = 100)` and `@NotBlank`.
- Rate limiting on guest creation is not implemented in this iteration.

### 10.3 Application Secret Management

- Application secrets are hashed with PBKDF2 (same as user passwords). The plaintext is never stored in the database.
- Each service receives its application secret as an environment variable (e.g., `APP_AUTH_SECRET`). The corresponding hash is seeded in the `applications` table via Liquibase for local dev.
- Local dev defaults are hardcoded in docker-compose.yml and the Liquibase seed. Production must override via environment variables and update the database hashes accordingly.
- Application secrets are transmitted over the network in the token acquisition request body. In production, this must be over HTTPS. For local dev over HTTP, this is accepted.
- Secret rotation is not in scope. For now, secrets are managed as environment variables and database seeds. A dedicated rotation mechanism can be added later if needed.

### 10.4 Pool User Security

- Pool users are regular entries in the `users` table with `client_type = APPLICATION`. They receive standard JWTs.
- If a pool user's token is somehow compromised, it can be invalidated by setting the user's status to `DISABLED`. The next validation call will reject the token.
- The `max_pool_size` limit prevents an attacker who compromises an application secret from creating unlimited user accounts.

### 10.5 Backward Compatibility

- The `clientType` claim is added to ALL new tokens. Old tokens (issued before migration) will not have this claim. The validation logic must handle missing `clientType` gracefully -- treat it as `REGISTERED_USER` for backward compatibility during the transition.
- The `password_hash` column becomes nullable, but existing rows all have non-null values. No data loss.

## 11. Trade-offs and Alternatives

### 11.1 Alternative: Local JWT Validation Instead of Centralized

**Rejected.** Distributing the JWT secret to all services would allow local validation without calling users-service. This would improve latency and remove the single point of failure. However, it was rejected because: (a) it contradicts the existing architecture decision documented in the original architecture-001, (b) it makes token revocation impossible without a distributed blocklist, (c) it requires secure secret distribution infrastructure that doesn't exist yet. This can be revisited when the platform needs to scale beyond what centralized validation supports.

### 11.2 Alternative: OAuth2 Client Credentials Grant for Applications

**Rejected for now.** The OAuth2 client_credentials flow is the industry standard for machine-to-machine auth. However, implementing a full OAuth2 authorization server is a significant effort that doesn't align with the current hand-coded auth approach. The proposed application token pool achieves the same goal (per-instance identity, time-bounded tokens) with less complexity. This should be revisited if the platform grows to need third-party integrations or standardized auth protocols.

### 11.3 Alternative: Separate Guest Token Service

**Rejected.** Creating a dedicated service for guest management would over-engineer the solution. Guest users are fundamentally the same as registered users (they have an ID, a token, and roles) with fewer fields. Keeping them in the same `users` table with a `client_type` discriminator is simpler and avoids cross-service joins or lookups.

### 11.4 Alternative: Anonymous Access (No Guest User Record)

**Rejected.** Allowing menu browsing and order submission without any user record would require significant changes to the authorization model (currently: every request has a userId from the token). Creating a lightweight guest user record preserves the existing authorization model and allows orders to be associated with a named guest for kitchen display purposes.

### 11.5 Trade-off: Pool Users vs. Stateless Application Tokens

The pool approach creates real user records for application instances. An alternative would be to issue application tokens that don't correspond to any user record, with a special `sub` claim. This was rejected because: (a) it would require all downstream validation to handle the "no user record" case, (b) it loses the ability to track and disable individual application instances, (c) it creates a divergent code path in validation logic.

### 11.6 Trade-off: 10-Minute Inactivity vs. Token-Expiry-Based Reclamation

Using a 10-minute heartbeat-based inactivity check means application services must periodically phone home. An alternative is to consider a pool user reclaimable only when its token has expired (1 hour). This is simpler (no heartbeat needed) but means crashed instances hold pool slots for up to 1 hour. The 10-minute approach with heartbeats reclaims faster. The heartbeat overhead is negligible (one HTTP call every 5 minutes per service instance).

## 12. Implementation Guidance for Planner

### 12.1 Recommended Task Splitting

The implementation should be split into the following tasks, in dependency order:

**Task A: Database schema changes (users-service)**
- Liquibase migration: add `client_type`, `display_name`, `application_id`, `last_active_at` to `users` table. Make `password_hash` nullable. Backfill `client_type` as `REGISTERED_USER` for existing rows.
- Liquibase migration: create `applications` table. Seed three application records (orders-client, menu-service, orders-service) with PBKDF2-hashed local-dev secrets.
- Liquibase migration: remove the 5 demo customer/manager seed users (alex.customer, nina.customer, sam.customer, olga.manager, disabled.user). Update admin user with `client_type = REGISTERED_USER` and `display_name = admin`.
- Update `UserAccount` domain entity and `JdbcUserRepository` mapping.
- Create `Application` entity and `ApplicationRepository`.
- No new endpoints yet.

**Task B: Application token pool (users-service)**
- Implement pool acquisition logic with `FOR UPDATE` locking.
- New endpoint: `POST /api/v1/auth/applications/token`.
- New DTOs.
- Integration tests for pool mechanics (concurrent acquisition, pool exhaustion, inactive reclamation).

**Task C: Guest user creation (users-service)**
- New endpoint: `POST /api/v1/auth/guests`.
- Authorization: caller must have APPLICATION clientType.
- 24-hour token issuance (configurable via `app.security.guest-token-expiration-seconds`).
- New DTOs.
- Integration tests.

**Task D: Token claim and validation changes (users-service)**
- Add `clientType` and `displayName` to JWT claims.
- Extend `ValidateTokenResponse` with `clientType` and `displayName`.
- Extend `LoginResponse` UserSummary with `displayName` and `clientType`.
- Handle backward compatibility for tokens without `clientType` claim.
- Update existing login to reject non-REGISTERED_USER accounts.
- Update `last_active_at` on login.
- Implement scheduled guest user archival job (disable guest users older than `app.security.guest-retention-days`, default 7 days).
- Update integration tests.

**Task E: Backend service startup auth (menu-service, orders-service)**
- Implement startup token acquisition for both services.
- Implement auto-refresh with scheduled executor.
- Implement retry with exponential backoff.
- Switch menu-service internal resolve endpoint from X-Service-Token to Bearer JWT validation.
- Switch orders-service menu lookup client from X-Service-Token to Bearer JWT.
- Add `user_display_name` column to orders-service `orders` table (Liquibase migration).
- Update orders-service to extract `displayName` from token validation and store on order records.
- Extend `SubmitOrderResponse` with `userDisplayName`.
- Update integration tests.
- Update docker-compose.yml with application secret environment variables.

**Task F: orders-client guest login flow**
- Implement application token management module (acquire on startup, auto-refresh, cache in module scope).
- Add "Continue as Guest" flow to home screen (name input, guest creation API call).
- Extend session handling for guest user type.
- Display user id and display name in order confirmation UI.
- Update environment variables and .env.example.
- Update nginx.conf for new endpoints.
- Update tests.

**Task G: Domain documentation updates**
- Update `domain-brain/entities/user-account.md` with new fields and client types.
- Update `domain-brain/entities/access-token.md` with new claims and token lifetimes.
- Update `domain-brain/flows/user-authentication.md` with guest and application flows.
- Update `domain-brain/invariants.md` with new invariants.
- Update `domain-brain/glossary.md` with new terms.
- Update `domain-brain/edge-cases.md` with new scenarios.
- Update `flow-index.yaml` with new paths.

### 12.2 Testing Strategy

- **Unit tests:** Pool acquisition logic, JWT claim generation with clientType, guest user creation validation.
- **Integration tests:** Full login flows for all three user types. Pool exhaustion and reclamation. Concurrent token acquisition. Guest user ordering end-to-end. Application service startup auth.
- **Existing tests:** Must continue to pass. The registered user login flow is unchanged.
- **orders-client tests:** Update the existing App.test.tsx integration test to cover guest login flow.

### 12.3 Migration Safety

- All schema changes are additive. No existing columns are dropped or renamed.
- `password_hash` is changed from NOT NULL to NULL. Existing data is unaffected (all existing rows have non-null values).
- `client_type` gets a DEFAULT value of `REGISTERED_USER`, so existing rows are automatically backfilled.
- The `applications` seed data uses the same precondition pattern as existing user seeds (check if table is empty or record doesn't exist).
- Demo user removal: a new migration deletes the 5 demo customer/manager users (IDs 1001-1005). The admin user (ID 1006) is preserved and updated with new columns. Existing tests that reference demo users must be updated to use admin or dynamically created test users.
- orders-service: the new `user_display_name` column is added as nullable, so existing order rows are unaffected (they will have NULL display name).

### 12.4 Configuration Defaults

New configuration properties for `users-service`:

```yaml
app:
  security:
    guest-token-expiration-seconds: ${USERS_GUEST_TOKEN_EXPIRATION_SECONDS:86400}  # 24 hours
    guest-retention-days: ${USERS_GUEST_RETENTION_DAYS:7}  # archive guests after 7 days
    application-inactive-threshold-minutes: ${APP_INACTIVE_THRESHOLD_MINUTES:10}
```

New configuration for backend services:

```yaml
app:
  auth:
    application-name: ${APP_AUTH_NAME:menu-service}
    application-secret: ${APP_AUTH_SECRET:menu-service-secret}
    token-refresh-factor: ${APP_AUTH_REFRESH_FACTOR:0.8}  # refresh at 80% of expiry
```

New configuration for orders-client (Vite env vars):

```
VITE_APP_NAME=orders-client
VITE_APP_SECRET=orders-client-secret
```

## 13. Required Documentation Updates

| Document | Changes |
|---|---|
| `domain-brain/entities/user-account.md` | Add `clientType`, `displayName`, `applicationId`, `lastActiveAt` fields. Document three client types. |
| `domain-brain/entities/access-token.md` | Add `clientType` and `displayName` claims. Document 24-hour lifetime for guest tokens. Document application tokens. |
| `domain-brain/flows/user-authentication.md` | Add guest authentication flow and application authentication flow as new sections. |
| `domain-brain/invariants.md` | Add: guest creation requires Application caller. Add: application pool max size. Add: guest tokens expire in 24 hours. Add: password_hash nullable for non-registered users. |
| `domain-brain/glossary.md` | Add: ClientType, GuestUser, ApplicationUser, ApplicationTokenPool, DisplayName. |
| `domain-brain/edge-cases.md` | Add: application pool exhaustion. Add: concurrent application token acquisition. Add: guest token expiry at terminal. Add: application startup when users-service unavailable. |
| `flow-index.yaml` | Add `apps/orders-client/src/features/auth/appToken.ts` to `user_authentication` paths. |
| `apps/users-service/api/openapi.yaml` | Add new endpoints and updated DTOs. |

## 14. Resolved Design Decisions

The following questions were raised during initial architecture review and resolved by the product owner:

1. **Guest user cleanup:** Guest tokens are valid for 24 hours (configurable via `app.security.guest-token-expiration-seconds`). Guest user records are archived (status set to DISABLED) after 7 days (configurable via `app.security.guest-retention-days`). A scheduled daily job in users-service handles the archival.

2. **Guest display name on orders:** Orders display both the user's id and display name. orders-service stores `user_display_name` on the order record (extracted from the token validation response). orders-client shows both id and name in the order confirmation UI.

3. **Application secret rotation:** Not in scope. Application secrets are managed as environment variables passed to each service and corresponding PBKDF2 hashes seeded in the `applications` table via Liquibase. Rotation requires updating both. A dedicated rotation mechanism can be added later.

4. **Rate limiting on guest creation:** Not needed for this iteration.

5. **Multiple orders-client instances:** Each frontend deployment (one Nginx instance) consumes exactly 1 application token from the pool. Multiple browser tabs (terminals) sharing the same frontend deployment share that single Application JWT. If a restaurant has multiple independent frontend deployments, each gets its own pool slot.

6. **Demo user seed data:** The 5 existing demo customer/manager users (alex.customer, nina.customer, sam.customer, olga.manager, disabled.user) are removed from seed data. Only the `admin` / `admin` user is retained. With guest access available, demo customer accounts are unnecessary.
