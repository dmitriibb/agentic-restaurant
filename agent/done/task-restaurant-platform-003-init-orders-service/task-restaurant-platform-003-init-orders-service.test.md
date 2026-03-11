# Test Report

## Validation Summary
- status: PASS
- `orders-service` compiled, packaged, started during integration tests, connected to compose MySQL (`orders-db`), ran Liquibase baseline, and returned readiness `UP` with DB health.

## Commands Run
- `docker compose config`
- `docker compose up -d --wait orders-db`
- `mvn test`
- `mvn -DskipTests package`

## Results
- unit tests: PASS
- integration tests: PASS
- lint: NOT RUN
- build: PASS
- static analysis: NOT RUN

## Failures
- none

## Coverage Gaps
- No lint/static-analysis checks are defined in this repository yet.
- Validation excludes order business behavior, token validation integration, and menu lookups by task scope.

## Notes
- `orders-db` compose service was left running as the local dependency.
- Packaging produced `apps/orders-service/target/orders-service-0.0.1-SNAPSHOT.jar`.
