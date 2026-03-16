# Test Report

## Validation Summary
- status: PASS
- Orders-client unit tests and production build both succeeded after the mode-gated auth-shell refactor.

## Commands Run
- `npm test` (in `apps/orders-client`)
- `npm run build` (in `apps/orders-client`)

## Results
- unit tests: PASS
- integration tests: NOT RUN
- lint: NOT RUN
- build: PASS
- static analysis: NOT RUN

## Failures
- none

## Coverage Gaps
- Integration/e2e checks were not part of this task scope.

## Notes
- Initial sandboxed `npm test` attempt failed with `EPERM` on user cache path access; validations were re-run successfully with escalated permissions.
