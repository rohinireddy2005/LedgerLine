# Multi-stage Dockerfile for LedgerLine Spring Boot Backend
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Add unprivileged user for security
RUN addgroup -S ledgerline && adduser -S ledgerline -G ledgerline
USER ledgerline:ledgerline

COPY --from=build /app/target/ledgerline-0.0.1-SNAPSHOT.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
