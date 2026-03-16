# Test Report

## Validation Summary
- status: PASS
- Retry validation succeeded: both required commands from the task now pass, and no transient root-level test log artifacts remain.

## Commands Run
- `Set-Location apps/production-service; go test ./...`
- `Set-Location apps/users-service; mvn test`
- `Set-Location c:\projects\agentic-restaurant; Get-ChildItem -Path . -File -Filter "test-*.log" | Select-Object -ExpandProperty Name`

## Results
- unit tests: PASS
- integration tests: PASS
- lint: NOT RUN
- build: NOT RUN
- static analysis: NOT RUN

## Failures
- None.

## Coverage Gaps
- No additional gaps for this retry scope. Required validation commands were executed and passed.
- Lint/build/static-analysis were not listed as required validation commands in this task and were not run in this stage.

## Notes
- `go test ./...` passed across `apps/production-service` (cached PASS where applicable).
- `mvn test` passed in `apps/users-service` with `Tests run: 16, Failures: 0, Errors: 0, Skipped: 0` and `BUILD SUCCESS`.
- Root-level transient test log artifact check returned no `test-*.log` files.
