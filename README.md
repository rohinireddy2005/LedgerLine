# LedgerLine - Money Movement with a Ledger You Can Prove

LedgerLine is a secure money movement application developed for the Snovasys Fresher Hiring Challenge 2026.

The application includes a React frontend and a Java Spring Boot backend. It focuses on secure account management, financial transactions, transaction integrity, idempotency, role-based authorization, and an auditable financial ledger.

## Technology Stack

### Backend

- Java 21
- Spring Boot 4
- Maven
- Spring Security
- JWT authentication
- Spring Data JPA / Hibernate
- PostgreSQL 18

### Frontend

- React
- Vite
- JavaScript
- HTML and CSS

### Testing

- JUnit
- Mockito
- PostgreSQL-backed integration tests

## Implemented Features

### Authentication and Authorization

- User registration and login.
- BCrypt password hashing.
- JWT-based stateless authentication.
- Role-based access for `ACCOUNT_HOLDER`, `ADMIN`, and `AUDITOR`.
- Registration assigns the `ACCOUNT_HOLDER` role.
- Protected endpoints reject unauthenticated requests.
- JWT validation checks the token subject and expiration.
- Privileged ADMIN and AUDITOR accounts are provisioned through environment configuration.

### Account Management

- Create and view accounts.
- Server-generated account numbers.
- Account ownership verification.
- Account status management.
- Admin operations to freeze, unfreeze, and close accounts.
- Account status audit history.

### Financial Transactions

- Deposit, withdrawal, and transfer operations.
- Positive amount and balance validation.
- Insufficient balance protection.
- Account ownership checks.
- Currency compatibility checks for transfers.
- Idempotency key validation and duplicate request handling.
- Database locking for critical transaction operations.
- Consistent account lock ordering for transfers.
- Ledger entries for successful money movements.

### Ledger and Audit

- Chronological account ledger.
- Append-only ledger protections.
- Database triggers preventing ordinary ledger and account status audit record modification.
- Auditor-only transaction, account, and ledger reporting.
- Admin account reconciliation reports.

### Frontend

- User registration and login.
- JWT-based authenticated access.
- Account overview using live backend data.
- Account creation and account listing.
- Deposit, withdrawal, and transfer interfaces.
- Transaction history and filtering.
- Account ledger with debit and credit entries.
- Logout and protected frontend access.

The frontend communicates with the backend through REST APIs.

## Database Security and Integrity

LedgerLine uses PostgreSQL constraints and restricted database permissions to strengthen financial data integrity.

Implemented protections include:

- Nonnegative account balance constraints.
- Positive transaction and ledger entry amount constraints.
- Foreign-key relationships.
- Unique idempotency keys per initiating user.
- Locking for critical transaction operations.
- Database triggers preventing updates and deletions of ledger entries and account status audit records.
- A separate `NOLOGIN` database owner role.
- A restricted runtime application database role.
- Production Hibernate schema validation using `ddl-auto=validate`.

The runtime application role does not own the production database tables. It has restricted table permissions and does not have `DELETE` or `TRUNCATE` permissions.

The runtime role has table-level `UPDATE` permission on accounts. Therefore, database permissions do not independently prevent every direct account balance or status update. Application authorization and transaction controls remain important.

Privileged database administrators can still bypass ordinary database protections. Independent backups and audit controls remain important.

## Prerequisites

Install:

- JDK 21
- Apache Maven 3.9 or later
- PostgreSQL 18
- Node.js and npm
- Git

Verify Java, Maven, Node.js, and npm:

```cmd
java -version
mvn -version
node -version
npm -version
```

## Environment Configuration

The backend requires these environment variables:

- `DB_PASSWORD` - PostgreSQL runtime application user's password.
- `JWT_SECRET` - Base64-encoded secret suitable for the application's JWT configuration.

Privileged account provisioning uses the following optional environment variables:

- `ADMIN_FULL_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `AUDITOR_FULL_NAME`
- `AUDITOR_EMAIL`
- `AUDITOR_PASSWORD`

Configure all six privileged-account variables together when provisioning these accounts.

Do not commit passwords, tokens, or secret values to Git.

## Database Setup

The production database must be provisioned by a database administrator before starting the application.

The production database uses:

- Database: `ledgerline_db`
- Runtime user: `ledgerline_app`
- Database owner role: `ledgerline_owner` (`NOLOGIN`)

The required tables, sequences, constraints, trigger functions, triggers, and runtime permissions must already exist.

The production application uses:

```properties
spring.jpa.hibernate.ddl-auto=validate
```

The runtime application user is not intended to perform production schema changes.

The SQL setup script is located at:

```text
src/main/resources/db/setup/financial_integrity.sql
```

The SQL setup script must be reviewed and executed by a database administrator during initial database provisioning. It is not automatically executed by the application.

Database setup and schema changes should be performed using an appropriately privileged database administration or migration account, not the runtime application account.

## Run the Backend

Open Command Prompt and navigate to the backend project directory:

```cmd
cd /d C:\LedgerLine\backend\ledgerline
```

Configure the required environment variables, then start the backend:

```cmd
mvn spring-boot:run
```

The backend runs at:

```text
http://localhost:8080
```

Health endpoint:

```text
GET /api/health
```

## Run the Frontend

Open a separate Command Prompt window:

```cmd
cd /d C:\LedgerLine\backend\ledgerline\frontend
```

Install the frontend dependencies:

```cmd
npm install
```

Start the Vite development server:

```cmd
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

Keep both the backend and frontend servers running while using the local application.

The backend CORS configuration currently allows the local frontend origin `http://localhost:5173`. Update the allowed origin before deploying the frontend to a different domain.

## Build the Frontend

From the frontend directory:

```cmd
npm run build
```

The production build is generated in the `dist` directory.

A successful local build has been verified.

Additional frontend verification:

- ESLint: Passed.
- `npm audit`: 0 vulnerabilities.
- Production build: Passed.

## API Areas

| Area | Endpoint examples | Access |
|---|---|---|
| Authentication | `/api/auth/register`, `/api/auth/login` | Public |
| Health | `/api/health` | Public |
| Accounts | `/api/accounts` | ACCOUNT_HOLDER |
| Transactions | `/api/transactions` | ACCOUNT_HOLDER |
| Administration | `/api/admin/**` | ADMIN |
| Audit reporting | `/api/auditor/**` | AUDITOR |

Protected endpoints require a valid JWT bearer token.

## Run Tests

The test profile uses a separate PostgreSQL test database:

```text
ledgerline_test_db
```

The test database must be created separately before running the test suite.

The test profile uses `ddl-auto=create-drop`, which recreates its schema during test execution. Use only a dedicated test database because its schema is recreated during tests.

Configure the required `DB_PASSWORD` environment variable, ensure the test database exists, and run:

```cmd
mvn clean test
```

### Latest Verified Regression Test Result

- Tests run: 83
- Failures: 0
- Errors: 0
- Skipped: 0
- Build: SUCCESS
- Verification date: November 11, 2026

PostgreSQL-backed integration tests include successful transfers and simultaneous opposite-direction transfers. These tests verify the tested scenarios; they are not a substitute for large-scale concurrency stress testing.

Test results describe the verified test run and do not guarantee that every deployment or production scenario has been tested.

## Project Documentation

- `THREATS.md` - Security threat model, implemented mitigations, and remaining risks.
- `PROMPTS.md` - AI usage documentation and implementation decisions.
- `src/main/resources/db/setup/financial_integrity.sql` - Database integrity setup script.

## Current Development Status

The project includes:

- React frontend integrated with the backend REST APIs.
- Authentication and role-based authorization.
- Account management.
- Deposits, withdrawals, and transfers.
- Idempotency and transaction integrity controls.
- Ledger and audit protections.
- Administrative operations.
- Auditor reporting and account reconciliation.
- PostgreSQL database permission hardening.

Local frontend build, backend regression tests, and manual frontend-to-backend workflows have been verified.

Further work remains, including:

- Deployment and deployed-environment end-to-end verification.
- Larger concurrency stress testing.
- Independent audit backup and tamper-evidence procedures.
- Additional production logging and secrets review.
- Further database permission hardening, including column-level account permissions.

Do not assume that unfinished features or unverified deployment scenarios are production-ready.

## Security Notes

- Never commit credentials, JWT tokens, or secret values.
- Use environment variables for sensitive configuration.
- Keep the runtime database role separate from the database owner.
- Enforce authorization on the server.
- Preserve ledger and audit record integrity.
- Verify transaction behavior under concurrent requests.
- Maintain independent database backups.

## Project Context

This project is developed as part of the Snovasys Fresher Hiring Challenge 2026.