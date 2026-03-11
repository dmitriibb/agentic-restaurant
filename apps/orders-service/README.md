# orders-service

Bootstrap Kotlin 21 Spring Boot service for order domain APIs.

## Local Run

1. Start local dependencies:
   - `docker compose up -d --wait orders-db`
2. Run tests:
   - `mvn test`
3. Run the service:
   - `mvn spring-boot:run -Dspring-boot.run.profiles=local`

Default port: `8083`

Readiness endpoint:
- `GET http://localhost:8083/actuator/health/readiness`
