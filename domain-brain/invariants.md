# Invariants

- `users-service` is the only service that owns credentials, password hashes, and JWT issuance.
- `menu-service` is the only service that owns menu item catalog data.
- `orders-service` is the only service that owns persisted orders and order lines.
- Services must not access another service's database directly.
- Services sharing a database engine type share a single database server instance; each service owns its own named database within that server.
- All new backend services must be implemented in Go unless there is a justified exception.
- Existing Java/Kotlin services are kept as-is; JVM memory is constrained via fixed heap limits and SerialGC for local development.
- Menu item ids are positive long values generated independently of Mongo `ObjectId`.
- Menu items exposed to clients always contain `id`, `name`, `description`, and `price`.
- Public menu API uses `double` for price because that is the requested contract, but persistence and calculations should use decimal-safe representations where possible.
- JWT access tokens expire after one hour.
- Protected backend requests are rejected when token validation fails.
- Internal service-to-service endpoints require service credentials and are not browser-facing APIs.
- An order submission must contain at least one line.
- Every order line quantity must be greater than zero.
- `userId` in an order request must match the authenticated token subject.
- Orders are idempotent per `(userId, requestId)`.
- Order lines store item name and unit price snapshots at submission time.
