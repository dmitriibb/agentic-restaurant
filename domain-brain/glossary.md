# Glossary

## AccessToken

A JWT issued by `users-service` and sent by the client in the `Authorization` header.

## ApplicationTokenPool

A bounded pool of application user identities used to issue JWTs for service/application instances, with inactivity-based reclamation.

## ApplicationUser

A caller with `clientType = APPLICATION` authenticated via application name and secret.

## Basket

The client-side collection of selected menu items and quantities before order submission.

## ClientType

A token/user classification enum with values `REGISTERED_USER`, `GUEST_USER`, and `APPLICATION`.

## DisplayName

A human-readable name associated with a user, especially guest users, shown in order flows.

## Display Mode

A passwordless, application-authenticated `staff-client` session that renders a read-only production board for customer-facing screens.

## GuestUser

A walk-in customer account created on demand with a display name and no password.

## MenuItem

A purchasable catalog entry displayed to the user and owned by `menu-service`.

## Order

The persisted record created by `orders-service` after successful validation of a submitted basket.

## OrderLine

A single submitted item reference with quantity and a snapshot of menu name and unit price.

## ProductionItem

One executable kitchen work unit generated from an accepted order line quantity and owned by `production-service`.

## ProductionOrder

The operational aggregate for an accepted order inside `production-service`.

## ProductionStatus

The lifecycle enum used by `production-service` for production orders and production items.

## Session Mode

Frontend-owned UI state that records whether the current experience is `registered`, `guest`, `interactive`, or `display`.

## RequestId

A client-generated identifier used in `PUT` order creation to make retries idempotent.

## Staff Board

The web interface used by restaurant staff to view queued work and update production item status.

## Interactive Mode

A `staff-client` session backed by a registered staff user token that can open order details and issue production commands.

## UserAccount

A platform user authenticated by `users-service`.

## User Authentication

The flow where a caller receives a JWT from `users-service` and uses it for protected requests.

## Shared MySQL Instance

A single MySQL 8.4 container (`restaurant-mysql`) hosting multiple logical databases (`users_db`, `orders_db`, `production_db`). Each service connects with its own credentials and is restricted to its own database.
