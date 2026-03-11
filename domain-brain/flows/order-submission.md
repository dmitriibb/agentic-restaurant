# Order Submission Flow

## Goal

Allow an authenticated user to submit an order built from menu item ids and quantities, then receive an order id.

## Steps

1. `orders-client` builds a basket locally from menu items.
2. Client generates a `requestId` and calls `PUT /api/v1/orders/{requestId}`.
3. `orders-service` validates the token with `users-service`.
4. `orders-service` verifies request `userId` matches the authenticated token subject.
5. `orders-service` resolves item ids against the internal lookup endpoint on `menu-service` using a service credential.
6. `orders-service` rejects the request if any item id is missing or any quantity is invalid.
7. `orders-service` snapshots menu item name and price for each order line.
8. `orders-service` persists the order and lines to MySQL.
9. `orders-service` returns the created `orderId`.

## Invariants

- Order creation is idempotent per `(userId, requestId)`.
- Orders must contain at least one line.
- Every line references a valid menu item at submission time.
- `userId` in the request must match the authenticated user.

## Failure Modes

- duplicate submission with the same `requestId`
- unknown menu item ids
- empty basket
- quantity less than 1
- expired or invalid token
- downstream menu or auth dependency unavailable
