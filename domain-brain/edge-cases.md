# Edge Cases

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

- Scenario: Token is expired while the client is still open.
  Expected handling: Protected requests fail and the client returns the user to login.

- Scenario: `users-service` is unavailable during token validation.
  Expected handling: Protected backend requests fail closed and surface dependency health clearly.

- Scenario: Menu price changes after a user has loaded the menu but before order submission.
  Expected handling: `orders-service` uses the current menu snapshot at submission time and persists that snapshot with the accepted order.
