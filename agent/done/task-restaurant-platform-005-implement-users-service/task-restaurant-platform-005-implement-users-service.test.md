# Test Report

## Validation Summary
- status: PASS
- `users-service` now authenticates seeded users, issues one-hour JWTs, validates internal tokens, and enforces service credential checks.

## Commands Run
- `docker compose up -d --wait users-db`
- `mvn test`
- `mvn -DskipTests package`

## Results
- unit tests: PASS
- integration tests: PASS
- lint: NOT RUN
- build: PASS
- static analysis: NOT RUN

## Failures
- Initial `mvn -DskipTests package` run failed during dependency metadata update because it was executed in parallel with `mvn test` and hit a `.m2` lastUpdated file access collision.
- Resolved by rerunning `mvn -DskipTests package` serially.

## Coverage Gaps
- No dedicated unit tests for password-hash utility internals.
- No transport-level contract tests for OpenAPI generation yet.

## Notes
- Integration tests pass for:
  - valid login
  - invalid login rejection
  - valid internal validation claims
  - expired token returns `valid=false`
  - missing service token returns `403`
