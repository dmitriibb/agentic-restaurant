# Test Report

## Validation Summary
- status: PASS
- All production-service tests pass. Build succeeds. Static analysis clean. users-service compiles with new migration.

## Commands Run
- `go test ./... -count=1 -v` in `apps/production-service`
- `go vet ./...` in `apps/production-service`
- `go build ./...` in `apps/production-service`
- `mvn compile -q` in `apps/users-service`

## Results
- unit tests: PASS (28 tests total across 7 packages)
  - `internal/api`: 10 tests — list orders, filter, get order, not found, pickup success, invalid transition 409, item not found, no auth 401, version conflict 409, block with reason
  - `internal/auth`: 6 tests — STAFF allowed, MANAGER allowed, missing header 401, invalid token 401, insufficient role 403, nil context
  - `internal/domain`: 26 tests — 9 derive order status + 5 valid transitions + 12 invalid transitions
  - `internal/consumer`: 4 tests — existing handler tests
  - `internal/config`: 1 test — existing config test
  - `internal/health`: 2 tests — existing health tests
  - `internal/rabbitmq`: 2 tests — existing topology and ping tests
- integration tests: NOT RUN (require running infrastructure)
- lint: PASS (go vet clean)
- build: PASS
- static analysis: PASS (go vet)

## Failures
- none

## Coverage Gaps
- Database integration tests require live MySQL and are not run in unit test mode
- SSE streaming is out of scope per task definition

## Notes
- users-service migration is additive (new changeset only), existing data unaffected
- All acceptance criteria covered by tests: auth success/failure, transition validation, conflict responses
