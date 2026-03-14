# Coder Report

## Implemented Documentation Updates

### Domain Entities
- Updated `domain-brain/entities/user-account.md`
  - Kept/new canonical fields aligned to implementation (`clientType`, `displayName`, `applicationId`, `lastActiveAt`, nullable `passwordHash`).
  - Added explicit client-type behavior section for `REGISTERED_USER`, `GUEST_USER`, and `APPLICATION`.
  - Normalized punctuation/encoding to plain ASCII.
- Updated `domain-brain/entities/access-token.md`
  - Documented `clientType` and `displayName` claims.
  - Documented per-client-type token lifetimes and guest token config.
  - Kept backward compatibility note for legacy tokens without `clientType`.

### Domain Flows
- Updated `domain-brain/flows/user-authentication.md`
  - Added separate sections for registered, guest, and application authentication flows.
  - Added validation path section with scoped `X-Service-Token` rule for `/internal/auth/validate`.
  - Aligned invariants/failure modes with implemented behavior.

### Domain Rules and Vocabulary
- Updated `domain-brain/invariants.md`
  - Added invariants for guest creation caller type, pool limits/locking, guest retention, nullable password scope, and inter-service auth rule.
- Updated `domain-brain/glossary.md`
  - Added `ClientType`, `GuestUser`, `ApplicationUser`, `ApplicationTokenPool`, and `DisplayName`.
- Updated `domain-brain/edge-cases.md`
  - Added pool exhaustion, concurrent acquisition, startup auth retries, guest token expiry, and legacy token compatibility scenarios.

### Flow Index
- Updated `flow-index.yaml` (`user_authentication.paths`) with implemented files:
  - `apps/users-service/src/main/kotlin/com/agentic/restaurant/users/api/AuthController.kt`
  - `apps/orders-client/src/features/auth/appToken.ts`
  - `apps/menu-service/src/main/java/com/agentic/restaurant/menu/application/StartupAuthClient.java`
  - `apps/orders-service/src/main/kotlin/com/agentic/restaurant/orders/application/StartupAuthClient.kt`

### API Contract Docs
- Updated `apps/orders-service/api/openapi.yaml`
  - Added `userDisplayName` (nullable) to `SubmitOrderResponse` schema to match implemented response model.
