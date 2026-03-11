# menu-service

Bootstrap Java 21 Spring Boot service for menu catalog APIs.

## Local Run

1. Start MongoDB from compose:
   - `docker compose up -d --wait mongo`
2. Run the service:
   - `mvn spring-boot:run -Dspring-boot.run.profiles=local`

Base URL: `http://localhost:8082`
Health readiness: `http://localhost:8082/actuator/health/readiness`
Swagger UI: `http://localhost:8082/swagger-ui.html`
