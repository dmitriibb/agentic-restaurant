# Test Report

## Validation Summary
- status: PASS
- `menu-service` compiled, packaged, started an embedded server in tests, verified Java 21 runtime enforcement at startup, connected to compose MongoDB, and reported readiness `UP` with Mongo health.

## Commands Run
- `docker compose config`
- `docker compose up -d --wait mongo`
- `mvn test`
- `mvn -DskipTests package`

## Results
- unit tests: PASS
- integration tests: PASS
- lint: NOT RUN
- build: PASS
- static analysis: NOT RUN

## Failures
- Initial test/build attempt failed because BOM bytes were introduced at file start by PowerShell encoding, causing Java compilation errors (`illegal character: '\ufeff'`).
- Resolved by rewriting `apps/menu-service` files as UTF-8 without BOM and rerunning validation successfully.

## Coverage Gaps
- No lint or static-analysis tooling exists in the repository yet.
- Validation intentionally excludes menu retrieval behavior, auth validation integration, and seeded data because those are out of scope for this bootstrap task.

## Notes
- `mongo` compose service was left running after validation as the expected local dependency.
- Packaging produced `apps/menu-service/target/menu-service-0.0.1-SNAPSHOT.jar`.