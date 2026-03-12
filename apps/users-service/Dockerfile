# ── Build stage ──────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies first (layer rarely changes)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Build the application
COPY src ./src
RUN mvn package -DskipTests -B

# ── Runtime stage ────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", \
  "-Xmx256m", \
  "-Xms128m", \
  "-XX:MaxMetaspaceSize=128m", \
  "-XX:+UseSerialGC", \
  "-XX:+TieredCompilation", \
  "-XX:TieredStopAtLevel=1", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
