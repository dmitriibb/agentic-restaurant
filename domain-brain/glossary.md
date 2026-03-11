# Glossary

## AccessToken

A JWT issued by `users-service` and sent by the client in the `Authorization` header.

## Basket

The client-side collection of selected menu items and quantities before order submission.

## MenuItem

A purchasable catalog entry displayed to the user and owned by `menu-service`.

## Order

The persisted record created by `orders-service` after successful validation of a submitted basket.

## OrderLine

A single submitted item reference with quantity and a snapshot of menu name and unit price.

## RequestId

A client-generated identifier used in `PUT` order creation to make retries idempotent.

## UserAccount

A platform user authenticated by `users-service`.

## User Authentication

The flow where a user logs in and receives a one-hour JWT.
