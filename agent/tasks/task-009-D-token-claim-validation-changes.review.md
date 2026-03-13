# Review Report

## Final Decision
APPROVED

## Summary
All 18 planned steps were implemented correctly and completely. JWT claims, validation response, login changes, guest archival, OpenAPI spec, integration tests, and domain documentation are all in place and consistent. All 15 integration tests pass with no failures. The implementation matches the plan and task requirements with no scope creep.

## Plan Compliance
- **Completed steps:** All 18 of 18 steps implemented
  - Step 1: `ValidateTokenResponse` extended with `clientType` and `displayName` (`AuthDtos.kt:38-39`)
  - Step 2: `AuthService.validateToken()` extracts `clientType` (default `REGISTERED_USER`) and `displayName` with DB fallback (`AuthService.kt:89-90`)
  - Step 3: Login rejects non-REGISTERED_USER accounts (`AuthService.kt:53-55`)
  - Step 4: `displayName` and `clientType` added to login `UserSummary` (`AuthService.kt:69-70`)
  - Step 5: `last_active_at` updated on login (`AuthService.kt:60`)
  - Step 6: `disableGuestsOlderThan()` added to `UserRepository` interface (`UserRepository.kt:12`)
  - Step 7: JDBC implementation with correct SQL targeting only ACTIVE GUEST_USER accounts (`JdbcUserRepository.kt:99-107`)
  - Step 8: `guest-retention-days` config in `application.yml` with env var override (`application.yml:46`)
  - Step 9: `guest-retention-days` config in `application-integration.yml` (`application-integration.yml:11`)
  - Step 10: `@EnableScheduling` on application class (`UsersServiceApplication.kt:8`)
  - Step 11: `GuestArchivalJob` component with configurable cron and retention days (`GuestArchivalJob.kt`)
  - Step 12: OpenAPI spec extended with `clientType` and `displayName` on `ValidateTokenResponse` (`openapi.yaml:195-201`)
  - Step 13: Login test updated with `clientType`/`displayName` assertions (`UsersServiceApplicationTests.kt:131-132`)
  - Step 14: Validation test updated with `clientType`/`displayName` assertions (`UsersServiceApplicationTests.kt:183-184`)
  - Step 15: New test: login rejects guest user (`UsersServiceApplicationTests.kt:229-245`)
  - Step 16: New test: login updates `last_active_at` (`UsersServiceApplicationTests.kt:247-261`)
  - Step 17: New test: legacy token backward compatibility (`UsersServiceApplicationTests.kt:263-284`)
  - Step 18: New test: guest archival job (`UsersServiceApplicationTests.kt:286-317`)
- **Missing steps:** none
- **Unexpected scope changes:** none

## Domain Review
- **Invariant checks:**
  - Login restricted to REGISTERED_USER only: enforced in `AuthService.login()` and documented in `user-authentication.md` invariants
  - `last_active_at` updated on login: enforced in `AuthService.login()` and documented
  - Guest archival targets only ACTIVE GUEST_USER: enforced in SQL WHERE clause (`JdbcUserRepository.kt:103-104`)
  - Backward compatibility for legacy tokens: enforced with `?: "REGISTERED_USER"` default (`AuthService.kt:89`)
- **domain-brain consistency:**
  - `access-token.md` updated with `clientType` and `displayName` claims, lifetime variation note, backward compatibility note
  - `user-authentication.md` updated with login rejection steps, `last_active_at` invariant, guest archival section
  - `user-account.md` updated with `clientType`, `displayName`, `applicationId`, `lastActiveAt` fields and guest archival lifecycle note
- **flow-index consistency:** `flow-index.yaml` already lists `user_authentication` flow with correct paths and entities (`UserAccount`, `AccessToken`). No changes needed for Task D scope.

## Validation Review
- **Tester results summary:** 15/15 integration tests pass, 0 failures, 0 errors, 0 skipped. Build compiles cleanly.
- **Missing or incomplete validation:**
  - No test for APPLICATION user login rejection (acceptable: APPLICATION type users created via pool don't have passwords, and this path is already covered by null-password check; also APPLICATION creation is tested in Task B scope)
  - No isolated test for `displayName` DB fallback when JWT claim is absent but DB has displayName (partially covered by legacy token test returning admin's displayName)
  - No negative test for `disableGuestsOlderThan()` when no matching guests exist (low-risk edge case)
  - These are all low-risk gaps acknowledged by the tester and are not blocking

## Documentation Review
- **Required docs present:**
  - `domain-brain/entities/access-token.md` - updated with clientType, displayName, backward compatibility
  - `domain-brain/flows/user-authentication.md` - updated with login rejection, last_active_at, guest archival
  - `domain-brain/entities/user-account.md` - updated with new fields and archival lifecycle
  - `openapi.yaml` - updated with extended ValidateTokenResponse schema
  - Task artifacts: `.plan.md`, `.coder.md`, `.test.md` all present
- **Missing docs:** none

## Blocking Issues
- none

## Non-Blocking Notes
- The `disableGuestsOlderThan()` SQL uses MySQL-specific `DATE_SUB()` function, which limits database portability. This is consistent with the rest of the codebase (e.g., `findAvailablePoolUser` also uses `DATE_SUB`), so not a concern for now.
- The `buildLegacyToken()` test helper hardcodes the JWT secret from `application-integration.yml`. If the test secret changes, this helper must be updated in sync. Consider extracting the secret as a shared test constant in a future refactor.
- `@EnableScheduling` is global and will activate for all `@Scheduled` methods. The coder noted this as a known limitation. Acceptable for current scope since the only scheduled job runs at 3 AM and won't fire during tests.
- The `UserSummary` in `LoginResponse` now includes `clientType` and `displayName`, but the OpenAPI `UserSummary` schema already had these fields (from Task C). Consistent.

## Handoff
- Ready for PR. All plan steps implemented, tests pass, domain docs updated, no blocking issues.
