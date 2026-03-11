# users-service

Bootstrap service for authentication-related infrastructure in the restaurant platform.

## Local run

1. Start local datastores with `docker compose up -d`.
2. Run the service from `apps/users-service` with `mvn spring-boot:run -Dspring-boot.run.profiles=local`.

## Local endpoints

- readiness: `http://localhost:8081/actuator/health/readiness`
- liveness: `http://localhost:8081/actuator/health/liveness`
- OpenAPI UI: `http://localhost:8081/swagger-ui.html`

## Notes

- The service currently bootstraps runtime, datasource, Liquibase, and OpenAPI contract structure only.
- Login and token validation behavior are intentionally deferred to later tasks.
