# Edge Cases

- Scenario: Application token pool reaches `max_pool_size` and all slots are active.
  Expected handling: `users-service` returns `503` for application token acquisition until a slot is reclaimed.

- Scenario: Concurrent application token acquisition requests for the same application.
  Expected handling: Database locking (`FOR UPDATE`) prevents duplicate assignment of the same pool slot.

- Scenario: Service startup occurs while `users-service` is unavailable.
  Expected handling: startup auth clients retry with exponential backoff; service remains up but outbound authenticated calls fail until token is acquired.

- Scenario: Guest token expires while a terminal session is still active.
  Expected handling: protected requests fail and terminal returns to guest entry/login path.

- Scenario: Legacy token without `clientType` claim is validated.
  Expected handling: validation treats caller as `REGISTERED_USER` for backward compatibility.

- Scenario: Client retries `PUT /orders/{requestId}` after a timeout.
  Expected handling: `orders-service` returns the already-created order for the same authenticated user and `requestId` instead of creating a duplicate.

- Scenario: Request body `userId` differs from the JWT subject.
  Expected handling: `orders-service` rejects the request as unauthorized or forbidden.

- Scenario: Menu item ids in an order no longer exist when the order is submitted.
  Expected handling: `orders-service` rejects the request and identifies invalid item ids.

- Scenario: The same menu item appears on multiple order lines.
  Expected handling: The request remains valid; lines are preserved as submitted unless business rules later require normalization.

- Scenario: A line item quantity is zero or negative.
  Expected handling: Validation fails before persistence.

- Scenario: `users-service` is unavailable during token validation.
  Expected handling: Protected backend requests fail closed and surface dependency health clearly.

- Scenario: Menu price changes after a user has loaded the menu but before order submission.
  Expected handling: `orders-service` uses the current menu snapshot at submission time and persists that snapshot with the accepted order.
