# Test Report

## Validation Summary
- status: PASS
- All 15 integration tests pass. Build compiles cleanly. No failures or errors.

## Commands Run
- `mvn compile -q` in `apps/users-service` (timeout 2 min)
- `mvn test -Dspring.profiles.active=integration` in `apps/users-service` (timeout 5 min)

## Results
- build: PASS (clean compilation, no warnings beyond Liquibase mysql advisory)
- integration tests: PASS (15/15 tests passed, 0 failures, 0 errors, 0 skipped)

### Test Breakdown (15 tests)
1. `liquibase seeds admin user and applications` - PASS
2. `admin user has correct client_type and display_name after migration` - PASS
3. `demo users are removed after migration` - PASS
4. `password_hash column is nullable` - PASS
5. `applications table has seeded records` - PASS
6. `login endpoint authenticates admin default credentials` - PASS (verifies clientType and displayName in UserSummary)
7. `login endpoint rejects invalid credentials` - PASS
8. `login endpoint rejects non-existent user` - PASS
9. `internal validation returns claims for valid token` - PASS (verifies clientType and displayName in ValidateTokenResponse)
10. `internal validation returns invalid false for expired token` - PASS
11. `internal validation rejects missing service token` - PASS
12. `login endpoint rejects guest user` - PASS (new: verifies GUEST_USER cannot login)
13. `login updates last_active_at` - PASS (new: verifies last_active_at is set after login)
14. `validation defaults clientType to REGISTERED_USER for legacy tokens` - PASS (new: backward compatibility)
15. `guest archival disables guests older than retention period` - PASS (new: verifies GuestArchivalJob behavior)

## Failures
- None

## Coverage Gaps
- No negative test for `disableGuestsOlderThan()` when no guests exist (edge case, low risk)
- No test for the scheduled cron trigger itself (only direct method invocation tested, which is acceptable for integration tests)
- No test for APPLICATION_USER login rejection (only GUEST_USER tested; APPLICATION_USER type is not yet implemented in prior tasks)
- No test for displayName fallback behavior when JWT claim is missing but DB has displayName (partially covered by legacy token test which checks clientType default, but displayName fallback path not explicitly isolated)

## Notes
- Build time: ~1m 21s total (compilation + tests)
- Test execution time: 28.98s for 15 tests
- Liquibase successfully ran 4 new changesets (004, 005, 005-seed, 006) during test startup
- GuestArchivalJob executed successfully during the archival test, archiving 1 old guest
- Spring Boot started in ~21s on integration profile with embedded Tomcat on random port
- Java agent dynamic loading warnings are benign (byte-buddy for Mockito/Spring test support)
