# orders-service

Kotlin 21 Spring Boot service for order submission and persistence.

## Local Run

1. Start local dependencies:
   - `docker compose up -d --wait mysql`
2. Run tests:
   - `mvn test`
3. Run the service:
   - `mvn spring-boot:run "-Dspring-boot.run.profiles=local"`

Default port: `8083`

Readiness endpoint:
- `GET http://localhost:8083/actuator/health/readiness`

## Implemented API

- `PUT /api/v1/orders/{requestId}`
  - requires `Authorization: Bearer <jwt>`
  - validates JWT through `users-service`
  - validates menu ids through `menu-service`
  - enforces idempotency per `(userId, requestId)`
  - persists `orders` + `order_lines` snapshots in MySQL
