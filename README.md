# LedgerLine — Money Movement with a Ledger You Can Prove

LedgerLine is a money movement application built with Java, Spring Boot, Spring Security, JWT authentication, and PostgreSQL.

The project focuses on secure financial transactions, account ownership, transaction integrity, idempotency, and an auditable ledger.

## Technology Stack

- Java 21
- Spring Boot
- Maven
- Spring Security
- JWT Authentication
- PostgreSQL 18
- JPA / Hibernate
- JUnit and Mockito

## Prerequisites

Install the following before running the backend:

- JDK 21
- Apache Maven 3.9+
- PostgreSQL 18
- Git

Verify the installations:

```bash
java -version
mvn -version
```

## Database Setup

### 1. Create the PostgreSQL database and application user

Connect to PostgreSQL as an administrator and execute:

```sql
CREATE USER ledgerline_app WITH LOGIN PASSWORD 'YOUR_PRIVATE_PASSWORD';

CREATE DATABASE ledgerline_db OWNER ledgerline_app;
```

If the user or database already exists, do not create it again.

### 2. Configure environment variables

Configure these Windows environment variables:

- `DB_PASSWORD` — password of the PostgreSQL application user.
- `JWT_SECRET` — a securely generated Base64-encoded secret suitable for your JWT configuration.

Do not commit passwords, tokens, or secret values to Git.

After setting environment variables, open a new terminal.

### 3. Start the backend once

From the project root:

```bash
mvn spring-boot:run
```

Hibernate is configured with `ddl-auto=update` to create or update the application tables.

Stop the application after the tables have been created.

### 4. Apply database integrity protections

Run the SQL setup script from the project root:

```bash
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U ledgerline_app -h localhost -p 5432 -d ledgerline_db -f "src/main/resources/db/setup/financial_integrity.sql"
```

The script installs database constraints for positive transaction amounts and nonnegative balances, along with a trigger that prevents ordinary updates and deletions of ledger entries.

This script is executed manually; it is not automatically run by Spring Boot.

## Run the Backend

From the project root:

```bash
mvn spring-boot:run
```

The backend runs at:

```text
http://localhost:8080
```

## Run Tests

Execute:

```bash
mvn clean test
```

The automated test suite currently includes unit tests for account services, transaction services, and security edge cases.

Database-level concurrency and integration behavior still requires dedicated verification.

## Database Integrity

LedgerLine uses:

- Positive transaction amount constraints.
- Nonnegative account balance constraints.
- Nonnegative ledger balance constraints.
- Unique idempotency keys per initiating user.
- Foreign-key relationships between users, accounts, transactions, and ledger entries.
- A database trigger preventing ordinary ledger-entry updates and deletions.
- Transactional service operations for money movement.

Privileged database owners may still bypass database protections. The trigger is not a substitute for restricted database administration and independent audit controls.

## Project Documentation

- `THREATS.md` — security threat model, mitigations, and remaining risks.
- `PROMPTS.md` — AI usage documentation and implementation decisions.
- `src/main/resources/db/setup/financial_integrity.sql` — database integrity setup script.

## Current Development Status

This project is under active development for the Snovasys Fresher Hiring Challenge 2026.

Some requirements, including database concurrency integration tests, complete role-based authorization, frontend integration, and deployment verification, require further implementation and testing.

Do not assume unfinished features are production-ready.

## Security Notes

- Never commit environment variables or credentials.
- Use secure password hashing.
- Enforce authorization on the server.
- Preserve the integrity and auditability of financial records.
- Verify transaction behavior under concurrent requests.

## License

This project is developed as part of the Snovasys Fresher Hiring Challenge 2026.