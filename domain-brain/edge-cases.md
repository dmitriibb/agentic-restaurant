# Edge Cases

- Scenario: Application token pool reaches `max_pool_size` and all slots are active.
  Expected handling: `users-service` returns `503` for application token acquisition until a slot is reclaimed.

- Scenario: Concurrent application token acquisition requests for the same application.
  Expected handling: Database locking (`FOR UPDATE`) prevents duplicate assignment of the same pool slot.

- Scenario: Service startup occurs while `users-service` is unavailable.
  Expected handling: startup auth clients retry with exponential backoff; service remains up but outbound authenticated calls fail until token is acquired.

- Scenario: Guest token expires while a terminal session is still active.
  Expected handling: protected requests fail and terminal returns to guest entry/login path.

- Scenario: Staff display mode cannot acquire an application token.
  Expected handling: the board does not load and the app remains on the display entry/loading state with a clear retry path.

- Scenario: Browser reload happens during an active orders or staff session.
  Expected handling: the client restores the remembered UI mode, restores human sessions from session storage when valid, and reacquires application tokens for app-backed modes instead of storing them in browser storage.

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

- Scenario: An accepted order contains a line with quantity greater than `1`.
  Expected handling: `orders-service` emits one production request event per quantity unit and `production-service` creates one `ProductionItem` per unit.

- Scenario: RabbitMQ is unavailable immediately after `orders-service` accepts an order.
  Expected handling: the order remains accepted, the outbox record stays pending, and background publishing retries until the production events are delivered.

- Scenario: RabbitMQ redelivers the same `production.item.requested.v1` event.
  Expected handling: `production-service` ignores the duplicate through event-id and source-item-key idempotency checks.

- Scenario: Two staff members try to pick up the same production item.
  Expected handling: only one transition succeeds; the other receives a conflict due to conditional update or optimistic locking.

- Scenario: One production item becomes `BLOCKED` while others are already `READY`.
  Expected handling: the production order remains not-ready and surfaces `BLOCKED` until the issue is resolved or the item is cancelled.

- Scenario: One order has queued, in-progress, and ready items at the same time.
  Expected handling: the order stays in the lane matching the derived order status while the card shows per-item counts with status icons.

- Scenario: Staff client reconnects after losing network connectivity.
  Expected handling: the client reloads the current board snapshot from `production-service` and then resumes its live update stream.
