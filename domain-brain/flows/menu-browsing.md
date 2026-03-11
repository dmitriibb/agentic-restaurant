# Menu Browsing Flow

## Goal

Allow an authenticated user to fetch and view the current menu catalog.

## Steps

1. `orders-client` sends a bearer token to `menu-service`.
2. `menu-service` validates the token with `users-service`.
3. `menu-service` reads menu items from MongoDB.
4. `menu-service` returns the list of menu items.
5. `orders-client` renders the catalog and allows the user to add items to the basket.

## Invariants

- Menu data is owned only by `menu-service`.
- Menu item ids are long values.
- Menu items exposed to clients contain id, name, description, and price.

## Failure Modes

- missing or invalid token
- unavailable token validation
- unavailable menu datastore
