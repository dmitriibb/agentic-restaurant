Working as tester agent.

## Validation Results
1. `mvn -Dtest=OrderOutboxPublisherTests test` in `apps/orders-service`
- Result: PASS (2 tests, 0 failures)

2. `mvn -DskipTests package` in `apps/orders-service`
- Result: PASS (build/package successful)

3. `mvn test` in `apps/orders-service`
- Result: FAIL in this environment due MySQL connectivity (`Communications link failure`, `Connection refused`)
- Notes: failure is environment-level (local Docker daemon unavailable), not implementation assertion failures.

## Coverage Notes
- Integration tests for order submission + outbox behavior were updated but could not be executed end-to-end without local MySQL.
