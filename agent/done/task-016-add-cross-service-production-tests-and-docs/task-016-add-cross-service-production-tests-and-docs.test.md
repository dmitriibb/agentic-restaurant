# Test Report

## Validation Summary
- status: PARTIAL
- `production-service` and `staff-client` validations passed; `orders-service` integration tests require local MySQL (Docker unavailable in this runtime).

## Commands Run
- `mvn test` (workdir: `apps/orders-service`)
- `docker compose up -d --wait mysql` (workdir: repository root)
- `Set-Location apps/production-service; go test ./...`
- `npm test` (workdir: `apps/staff-client`)

## Results
- unit tests: PASS (production-service, staff-client)
- integration tests: PARTIAL (`orders-service` integration suite blocked by unavailable MySQL)
- lint: NOT RUN
- build: NOT RUN
- static analysis: NOT RUN

## Failures
- `mvn test` in `apps/orders-service` failed during Spring context startup with MySQL connectivity error (`Communications link failure`).
- Attempt to start MySQL dependency via `docker compose up -d --wait mysql` failed because Docker engine is unavailable (`//./pipe/dockerDesktopLinuxEngine` not found).

## Coverage Gaps
- Could not complete required `orders-service` integration validation in this environment.
- Did not run `tests/production-pipeline-smoke.ps1` because local compose stack is not available.

## Notes
- `go test ./...` in `apps/production-service` passed including updated handler tests.
- `npm test` in `apps/staff-client` passed with 7/7 tests.
