# Test Report

## Validation Summary
- status: PASS
- orders-service now validates auth/menu dependencies, enforces `(userId, requestId)` idempotency, and persists accepted orders with line snapshots.

## Commands Run
- `docker compose up -d --wait orders-db`
- `mvn test`
- `mvn -DskipTests package`

## Results
- unit tests: PASS
- integration tests: PASS
- build: PASS
- lint: NOT RUN
- static analysis: NOT RUN

## Failures
- Initial compile failed due Kotlin placeholder escaping in `@Value` and a decimal conversion mismatch in order total calculation.
- Fixed by escaping Spring placeholders (`\${...}`) and converting menu price `Double` to `BigDecimal` before scaling.

## Coverage Gaps
- No live cross-service integration test against running users/menu services.
- No concurrency stress test for duplicate idempotent writes.

## Notes
- Integration suite executed 10 tests including validation failures, idempotency, and snapshot persistence checks.
