# LedgerLine - Threat Model

## 1. Project Overview

LedgerLine is a money movement application that provides account management, financial transactions, administrative controls, auditor reporting, and an auditable transaction ledger.

The frontend is implemented using React and Vite and communicates with the Spring Boot REST APIs. The backend uses Java 21, Spring Boot, Spring Security, JWT authentication, Spring Data JPA, and PostgreSQL.

This threat model identifies important assets, potential security threats, implemented mitigations, and controls that still require implementation or verification.

## 2. Assets to Protect

- User credentials and personal information
- Authentication tokens
- Account details and ownership information
- Account balances
- Transaction records
- Ledger entries
- Account status history and administrative audit records
- Administrative and auditor access
- Database credentials and application secrets
- Financial transaction integrity and audit history

## 3. Identified Threats and Mitigations

### Threat 1 - Unauthorized Access

**Risk:** An unauthenticated person may attempt to access protected API endpoints.

**Mitigations:**

- Require authentication for protected endpoints.
- Use JWT-based authentication.
- Return HTTP 401 for unauthenticated requests.
- Keep the application stateless.

**Implementation status:** Implemented and tested through API-level security tests. Unauthenticated requests to protected account, transaction, administrator, and auditor APIs are rejected with HTTP 401.

Local verification using the production application profile and restricted database role also confirmed that an unauthenticated request to `/api/accounts` returns HTTP 401.

### Threat 2 - Broken Object-Level Authorization

**Risk:** One account holder may attempt to access another user's account or financial records.

**Mitigations:**

- Derive the authenticated user's identity from the security context.
- Verify account ownership on account-specific requests.
- Never trust an owner ID supplied by the client.
- Reject unauthorized access to another user's account and ledger.

**Implementation status:** Account ownership checks are implemented. PostgreSQL integration tests verify that one user cannot access another user's account, view another user's ledger, or initiate transactions against another user's account.

### Threat 3 - Password Exposure

**Risk:** Stored passwords may be exposed if the database is compromised.

**Mitigations:**

- Hash passwords using BCrypt.
- Never store plaintext passwords.
- Never return passwords in API responses.
- Keep credentials outside source control.

**Implementation status:** BCrypt password hashing with strength 12 and dedicated response DTOs are implemented.

Privileged ADMIN and AUDITOR account initialization also uses BCrypt password encoding. Their initial credentials are supplied through environment-based configuration rather than public registration.

Database credentials and JWT secrets use environment variables. Final deployment secret-management and repository reviews remain necessary.

### Threat 4 - Token Misuse

**Risk:** A stolen, invalid, or expired JWT may be used to attempt unauthorized access.

**Mitigations:**

- Sign JWTs using a securely generated secret.
- Validate token signatures and expiration.
- Use a limited token lifetime.
- Keep JWT secrets outside the repository.
- Reject invalid and expired tokens.

**Implementation status:** JWT authentication, signature validation, expiration validation, and environment-based secret configuration are implemented. Automated API-level tests verify that malformed and expired JWTs receive HTTP 401.

The JWT validation logic also checks the token subject and rejects tokens without a valid expiration claim.

Local verification using the production application profile also confirmed successful login and authenticated access to the account endpoint.

### Threat 5 - Duplicate Financial Requests

**Risk:** Repeated requests may accidentally process the same financial operation more than once.

**Mitigations:**

- Require idempotency keys for financial operations.
- Associate request identifiers with the authenticated user.
- Enforce uniqueness of the initiator and idempotency-key combination in PostgreSQL.
- Return the original transaction result for a repeated request with the same key.
- Reject reuse of a key with different transaction details.
- Serialize concurrent requests from the same initiating user where required.

**Implementation status:** Idempotency handling and the database uniqueness constraint are implemented.

PostgreSQL integration tests verify that:

- Sequential repeated requests do not create additional transactions or ledger entries.
- Concurrent requests using the same idempotency key return the same transaction result.
- Concurrent duplicate requests create only one transaction and one ledger entry.
- The account balance is updated only once.
- Reusing a key with different transaction details is rejected.

The focused `MoneyTransactionIdempotencyPostgresIntegrationTest` passed with two tests, zero failures, zero errors, and zero skipped tests.

### Threat 6 - Concurrent Transactions

**Risk:** Simultaneous financial operations may produce incorrect balances or inconsistent transaction records.

**Mitigations:**

- Use database transactions.
- Apply database locking where required.
- Lock transfer accounts in a consistent order.
- Validate available balances before withdrawals and transfers.
- Test simultaneous transaction scenarios against PostgreSQL.

**Implementation status:** Transaction boundaries and pessimistic account locking are implemented.

PostgreSQL integration tests execute simultaneous withdrawals and verify that only one withdrawal succeeds when the combined withdrawal amount exceeds the available balance. The final balance and ledger entries are verified.

Additional PostgreSQL integration tests verify concurrent duplicate idempotency requests.

Additional PostgreSQL integration testing verifies simultaneous transfers in opposite directions between two accounts. Both transfers complete successfully, account balances return to their expected values, the total money remains unchanged, and the expected transaction and ledger records are persisted.

The opposite-direction transfer test uses concurrent execution with a synchronization barrier. It verifies this specific simultaneous-transfer scenario; larger-scale concurrent transaction stress testing remains pending.

### Threat 7 - Unauthorized Balance Modification

**Risk:** A client may attempt to manipulate account balances directly.

**Mitigations:**

- Never accept a client-provided balance during account creation.
- Perform balance changes through authorized backend services.
- Record financial changes through transaction and ledger operations.
- Apply database constraints to prevent negative account balances.
- Restrict database permissions using a separate database owner and runtime application role.
- Reconcile account balances against ledger records.

**Implementation status:** Server-controlled account creation and backend transaction processing are implemented. PostgreSQL check constraints prevent negative account balances.

Administrative reconciliation is implemented to compare account balances against ledger records and identify inconsistencies without modifying financial records.

Production database privilege hardening has been completed and verified. The runtime application role does not own the production database, tables, sequences, or trigger functions. It does not have permission to create schema objects or modify or delete append-only ledger and audit records.

The runtime role has SELECT, INSERT, and UPDATE permissions on the accounts table because application operations require account updates. This table-level UPDATE permission is broader than a column-specific permission and remains a possible future hardening improvement.

### Threat 8 - Financial Record Tampering

**Risk:** Transaction records or ledger entries may be modified or deleted without authorization.

**Mitigations:**

- Design the ledger as an append-only financial record.
- Avoid normal application operations that edit or delete completed ledger entries.
- Record transaction details and outcomes.
- Use database-level protections against ledger updates and deletions.
- Reconcile account balances against ledger records.
- Separate database ownership from runtime application access.

**Implementation status:** Ledger entity columns are configured as non-updatable through normal JPA updates. PostgreSQL database-level protections are implemented using a trigger that rejects UPDATE and DELETE operations on ledger entries.

An integration test verifies that these operations are rejected and that the original ledger entry remains unchanged. Database check constraints also protect positive transaction amounts, positive ledger entry amounts, and nonnegative balances.

Administrative account reconciliation is implemented through:

`GET /api/admin/accounts/{accountId}/reconciliation`

The reconciliation operation:

- Calculates the account balance from ledger entries in chronological order.
- Verifies each ledger entry's recorded running balance.
- Detects ledger entries associated with non-successful transactions.
- Compares the calculated ledger balance with the account's stored balance.
- Reports detected inconsistencies without modifying account balances or ledger records.

PostgreSQL-backed integration tests verify successful reconciliation, incorrect running balances, and ledger entries associated with rejected transactions.

The PostgreSQL-backed administrative API integration tests verify reconciliation behavior, including successful reconciliation, incorrect running balances, and ledger entries associated with rejected transactions.

Production database ownership and runtime privileges have been separated. The `ledgerline_owner` role owns the production database objects and cannot log in. The `ledgerline_app` runtime role cannot alter or disable the database triggers because it does not own those objects and does not have the required DDL privileges.

A sufficiently privileged database owner or database administrator can still modify database protections. Independent reconciliation scheduling, external tamper-evidence mechanisms, and audit backup verification remain additional security considerations.

### Threat 9 - Privilege Escalation

**Risk:** A normal account holder may attempt to access administrator or auditor functionality, or assign themselves a privileged role.

**Mitigations:**

- Define separate ADMIN, ACCOUNT_HOLDER, and AUDITOR roles.
- Enforce role-based authorization on protected endpoints.
- Never accept a role directly from public registration requests.
- Verify authorization independently of frontend visibility.
- Keep ownership checks in addition to role checks.
- Initialize privileged accounts through controlled configuration rather than public registration.

**Implementation status:** All three roles are defined. Public registration always creates an ACCOUNT_HOLDER, and automated tests verify that privileged roles cannot be assigned through the registration API.

The existing account and transaction APIs require the ACCOUNT_HOLDER role. API-level tests verify that ADMIN and AUDITOR tokens receive HTTP 403 when accessing these account-holder endpoints.

Dedicated auditor reporting endpoints are implemented for transaction history, account reports, and account ledger reports. API-level tests verify that only AUDITOR users can access these routes, while ADMIN and ACCOUNT_HOLDER users receive HTTP 403.

Administrative management endpoints are implemented under `/api/admin/**`. They require the ADMIN role, with an additional administrator-role check in the service layer.

API integration tests verify administrator access and reject ACCOUNT_HOLDER and AUDITOR attempts to use administrative operations.

Privileged account initialization uses six environment variables for ADMIN and AUDITOR names, emails, and passwords. The initializer:

- Skips initialization when all six settings are absent.
- Rejects incomplete configuration.
- Validates configured values.
- Normalizes email addresses.
- Encodes passwords using BCrypt.
- Leaves existing accounts with the expected roles unchanged.
- Rejects an existing account with a conflicting role.

Five dedicated initializer tests verify these behaviors. The initializer has been tested through the complete Maven suite.

Production provisioning, operational credential rotation, and deployment configuration review remain pending.

### Threat 10 - Sensitive Information Exposure

**Risk:** API responses, logs, or repository files may expose passwords, tokens, or secrets.

**Mitigations:**

- Return dedicated response DTOs.
- Avoid logging credentials and authentication tokens.
- Exclude secret configuration files from Git.
- Use environment variables for sensitive configuration.
- Review API responses and application logs before deployment.

**Implementation status:** Dedicated response DTOs and environment-based configuration for database credentials and JWT secrets are implemented. Auditor response DTOs exclude password hashes and idempotency keys.

The production database connection uses environment-based credentials. Final logging review, repository secret scanning, and deployment configuration review remain pending.

### Threat 11 - Unauthorized Auditor Data Access

**Risk:** Users without auditor privileges may attempt to access transaction history, account reports, or ledger information across users.

**Mitigations:**

- Require the AUDITOR role for auditor endpoints.
- Keep auditor reporting endpoints read-only.
- Return dedicated audit response DTOs.
- Avoid exposing password hashes and idempotency keys.
- Validate pagination parameters.
- Test access using different authenticated roles.

**Implementation status:** Read-only auditor reporting routes are implemented for transactions, accounts, and account ledger entries.

Service tests verify report mapping and missing-account handling. API security tests verify role restrictions and invalid pagination responses.

PostgreSQL-backed API integration tests verify successful and rejected transaction history, successful ledger movements with running balances, and account ownership and final balance reporting.

Further verification of report completeness, larger datasets, and production audit workflows remains pending.

### Threat 12 - Unauthorized Administrative Account Changes

**Risk:** An administrator or unauthorized user may attempt to freeze, unfreeze, or close accounts without proper authorization or a valid state transition.

**Mitigations:**

- Require ADMIN authorization for administrative endpoints.
- Verify administrator identity from the authenticated security context.
- Validate account status transitions.
- Prevent closing accounts with nonzero balances.
- Serialize account status changes using database locking.
- Record every successful status change in an audit table.
- Prevent modification and deletion of account status audit records at the database level.

**Implementation status:** Administrative account management is implemented.

The ADMIN API supports:

- Paginated user listing.
- Paginated account listing.
- Individual account lookup.
- Account freezing.
- Account unfreezing.
- Account closure.
- Global account status audit history.
- Account-specific account status audit history.

Implemented transition rules include:

- ACTIVE to FROZEN.
- FROZEN to ACTIVE.
- ACTIVE to CLOSED when the balance is zero.
- FROZEN to CLOSED when the balance is zero.
- CLOSED accounts cannot be reactivated or transitioned to another status.

Account status changes use pessimistic locking. The same account lock is used by financial transaction operations, preventing conflicting status changes and money movements from proceeding independently.

Each successful status change records the previous status, new status, administrator identity, reason, and timestamp in `account_status_audits` within the same database transaction.

Administrator integration tests verify successful freeze, unfreeze, and closure operations, audit creation, rejection of closure with a nonzero balance, and role restrictions.

A PostgreSQL integration test verifies that account status audit records cannot be updated or deleted. The actual production database was inspected and the ledger and account status audit triggers were confirmed enabled.

Production database privilege hardening has also been completed. The runtime application role is separate from the owner of the database objects and cannot modify or remove the account status audit trigger.

Independent audit backups and external tamper-evidence mechanisms remain pending.

### Threat 13 - Account Status Audit Tampering

**Risk:** An attacker or privileged application component may attempt to alter or delete the history of administrative account status changes.

**Mitigations:**

- Store account status changes as separate audit records.
- Record the previous and new statuses.
- Record the administrator identity and reason.
- Persist the audit record in the same transaction as the status change.
- Prevent UPDATE and DELETE operations through database-level triggers.
- Separate database object ownership from the runtime application role.

**Implementation status:** The `account_status_audits` table and audit persistence are implemented. A PostgreSQL trigger rejects UPDATE and DELETE operations on account status audit records.

The focused PostgreSQL integration test verifies that both operations are rejected and that the original audit record remains unchanged. The actual production database was inspected and both the ledger and account status audit triggers were confirmed enabled.

Production database privilege hardening is completed. The `ledgerline_owner` role owns the database objects and is configured with NOLOGIN. The `ledgerline_app` runtime role does not own the audit table or trigger function and cannot alter or disable the protection through its normal database permissions.

Independent audit backups and external tamper-evidence mechanisms remain pending.

## 4. Security Testing Plan

The following scenarios are included in the security verification plan.

| Test scenario | Current status |
|---|---|
| Unauthenticated requests to protected endpoints | Implemented and tested |
| Account ownership restrictions | Implemented and tested |
| Cross-user ledger access restrictions | Implemented and tested |
| Invalid JWT rejection | Implemented and tested |
| Expired JWT rejection | Implemented and tested |
| Public registration role restriction | Implemented and tested |
| Duplicate registration attempts | Implemented and tested |
| ACCOUNT_HOLDER API authorization | Implemented and tested |
| ADMIN restrictions on account-holder APIs | Implemented and tested |
| AUDITOR restrictions on account-holder APIs | Implemented and tested |
| Invalid financial input validation | Implemented and tested |
| Repeated financial requests | Implemented and tested |
| Concurrent duplicate idempotency requests | Implemented and tested |
| Withdrawals exceeding available balances | Implemented and tested |
| Inactive account restrictions | Implemented and tested |
| Currency mismatch | Implemented and tested |
| Maximum balance restrictions | Implemented and tested |
| Concurrent withdrawals against PostgreSQL | Implemented and tested |
| Simultaneous opposite-direction transfers against PostgreSQL | Implemented and tested |
| Database-level ledger UPDATE/DELETE protection | Implemented and tested |
| Auditor transaction report access | Implemented and tested |
| Auditor account report access | Implemented and tested |
| Auditor ledger report access | Implemented and tested |
| Auditor role restrictions | Implemented and tested |
| Auditor pagination validation | Implemented and tested |
| Auditor report mapping and account balance verification | Implemented and tested |
| ADMIN API authorization | Implemented and tested |
| ADMIN account status transitions | Implemented and tested |
| ADMIN nonzero-balance closure rejection | Implemented and tested |
| Account status audit creation | Implemented and tested |
| Account status audit UPDATE/DELETE protection | Implemented and tested |
| Privileged account initialization with BCrypt | Implemented and tested |
| Missing privileged account configuration | Implemented and tested |
| Partial privileged account configuration rejection | Implemented and tested |
| Existing privileged account role conflict rejection | Implemented and tested |
| Ledger-to-account-balance reconciliation | Implemented and tested |
| Incorrect ledger running-balance detection | Implemented and tested |
| Ledger entries for rejected transactions | Implemented and tested |
| Production database ownership separation | Implemented and verified |
| Production runtime database privilege restrictions | Implemented and verified |
| Production Hibernate schema validation | Implemented and verified |
| Local production-profile application startup with restricted database role | Implemented and verified |
| Local production-profile health endpoint | Implemented and verified |
| Local production-profile registration and login | Implemented and verified |
| Local production-profile authenticated account endpoint | Implemented and verified |
| Final logging and secret-exposure review | Pending |
| Production credential provisioning and rotation | Pending |
| Independent audit backups and tamper-evidence verification | Pending |
| Larger auditor reporting datasets and pagination workflows | Pending |
| Production deployment and deployed-environment end-to-end verification | Pending |
| Larger concurrent transaction load testing | Pending |
| Column-level database permissions for account updates | Pending |
| Production frontend CORS configuration and verification | Pending |

## 5. Security Principles

LedgerLine follows these security principles:

- Least privilege
- Defense in depth
- Server-side validation
- Ownership-based authorization
- Role-based authorization
- Secure password storage
- Transaction integrity
- Idempotent financial operations
- Database-level integrity constraints
- Append-only financial record design
- Auditability
- Controlled privileged account provisioning
- Read-only financial reconciliation
- Separation of database ownership and runtime access
- Explicit identification of pending security controls

## 6. Implementation Status and Review

This document distinguishes implemented controls from planned or partially verified controls.

A control is described as implemented and tested only when supported by the current code and relevant test results.

### Completed production database hardening

Production database privilege hardening was completed and verified on November 9, 2026.

The following changes were made:

1. Created a separate database owner role named `ledgerline_owner`.
2. Configured `ledgerline_owner` with NOLOGIN and without elevated role attributes.
3. Transferred ownership of the production database to `ledgerline_owner`.
4. Transferred ownership of all five application tables to `ledgerline_owner`.
5. Transferred ownership of all five application sequences to `ledgerline_owner`.
6. Transferred ownership of the ledger and account status audit trigger functions to `ledgerline_owner`.
7. Changed production Hibernate configuration from `ddl-auto=update` to `ddl-auto=validate`.
8. Removed unnecessary runtime application permissions.

The production runtime role `ledgerline_app` has the following access:

- CONNECT on the production database.
- USAGE on the `public` schema.
- SELECT and INSERT on `users`.
- SELECT, INSERT, and UPDATE on `accounts`.
- SELECT and INSERT on `money_transactions`.
- SELECT and INSERT on `ledger_entries`.
- SELECT and INSERT on `account_status_audits`.
- USAGE on the application sequences.

The runtime application role does not have:

- Ownership of the production database or application tables.
- CREATE permission on the production schema.
- DELETE or TRUNCATE permission on application tables.
- UPDATE permission on append-only ledger and account status audit tables.
- Ownership of the database trigger functions.
- Permission to alter or disable the existing database integrity triggers through its normal runtime privileges.

The account table still has table-level UPDATE permission because account operations require updates. Column-level permission restrictions are a possible future improvement.

### Financial integrity initializer

The `FinancialIntegrityInitializer` executes database-level integrity setup statements.

It was configured with `@Profile("test")` so that the runtime production application does not attempt to create or replace database functions, constraints, or triggers using the restricted application role.

The production database already contains the required constraints and triggers. Their presence and enabled status were verified.

The production application successfully started with the restricted database role and `ddl-auto=validate`.

The test profile continues to use the initializer for test database setup.

### Backup verification

Before production privilege changes, a PostgreSQL backup was created.

The backup archive was inspected and restored into a separate verification database named `ledgerline_backup_verify`.

The restored database was checked for application tables, data, and database triggers. Both the ledger modification trigger and account status audit modification trigger were confirmed enabled in the restored database.

This verifies that the created backup could be restored successfully. Ongoing independent audit backups and recovery procedures remain pending.

### Local production-profile application verification

The application was started locally using the production application profile and the restricted `ledgerline_app` database role.

The following checks were completed:

- Hibernate successfully validated the existing database schema.
- Spring Security initialized successfully.
- Tomcat started on port 8080.
- The `/api/health` endpoint returned HTTP 200.
- An unauthenticated request to `/api/accounts` returned HTTP 401.
- Test-user registration returned HTTP 201.
- Test-user login returned HTTP 200.
- An authenticated request to `/api/accounts` returned HTTP 200.

These checks verify the tested local startup and API operations using the production profile and restricted database role. They do not establish that the application has been deployed to a production hosting environment or that every endpoint and deployment scenario has been verified.

### Frontend verification

The React and Vite frontend has been implemented and integrated with the backend APIs.

The frontend production build was verified using:

`npm run build`

The build completed successfully.

Local end-to-end checks covered:

- User login and logout.
- Account data display.
- Deposit operations.
- Withdrawal operations.
- Transfer operations.
- Transaction and ledger data display.

These checks were performed in the local development environment. Deployed-environment end-to-end verification remains pending.

The current CORS configuration permits the local frontend origin `http://localhost:5173`. The allowed origin must be updated to the actual frontend hosting origin before deployment. Production cross-origin access has not yet been verified.

### Threat 15 - Recipient Enumeration and PII Disclosure in Inter-Account Transfers

**Risk:** Attackers may attempt to probe account numbers via lookup APIs to harvest customer names, email addresses, or balance information.

**Mitigations:**

- Require `ROLE_ACCOUNT_HOLDER` authentication for account lookup endpoints (`/api/accounts/lookup/{accountNumber}`).
- Return a minimal `AccountLookupResponse` DTO containing only `accountNumber`, `currency`, `status`, and masked `ownerDisplayName`.
- Never expose recipient email, user ID, internal database account ID, or account balance in lookup responses.
- Implement server-side name masking (e.g., "Rohini R." for "Rohini Rao", or single names with masked trailing initials) to confirm payment destination without leaking full PII.
- Only return confirmation for valid active or frozen accounts, preventing transfer routing errors before execution.

**Implementation status:** Implemented and tested in `AccountServiceTest` (`lookupAccountByNumberReturnsMaskedNameAndDetails`, `lookupNonexistentAccountReturnsNotFound`). Unauthenticated access is rejected with HTTP 401.

### Threat 16 - Deadlocks and Race Conditions During Account-Number Transfer Resolution

**Risk:** Resolving recipient accounts by alphanumeric account number (`LL...`) instead of numeric IDs might bypass the deterministic lock ordering protocol, leading to PostgreSQL deadlocks or concurrency vulnerabilities under simultaneous transfers.

**Mitigations:**

- Resolve `destinationAccountNumber` to internal `destinationId` in the service layer prior to acquiring pessimistic write locks.
- Maintain strict deterministic locking order (`min(sourceId, destId)` locked before `max(sourceId, destId)`).
- Acquire user-level advisory transaction locks prior to executing balance updates.
- Ensure transfer idempotency keys are checked before any balance or ledger mutation occurs.
- Verify identical behavior whether transfer is requested via `destinationAccountId` or `destinationAccountNumber`.

**Implementation status:** Implemented and tested in `MoneyTransactionServiceTest` (`transferWithDestinationAccountNumberShouldSucceed`, `transferWithUnknownDestinationAccountNumberThrowsNotFound`). The complete PostgreSQL-backed integration test suite verified deterministic locking and simultaneous transfers.

### Remaining work

The following areas require further work:

1. Final secret-management, logging, and deployment review.
2. Production privileged-account provisioning and credential rotation.
3. Independent audit backups and additional tamper-evidence mechanisms.
4. Further auditor reporting tests involving larger datasets and pagination.
5. Production deployment and deployed-environment end-to-end verification.
6. Additional stress testing under larger concurrent transaction loads.
7. Review of column-level database permissions for account updates.
8. Production frontend CORS configuration and verification.

Concurrent duplicate idempotency request testing, ledger-to-account-balance reconciliation, production database privilege hardening, local production-profile startup verification, and local frontend end-to-end checks have been implemented and tested or verified as described above.

Unimplemented or unverified controls remain pending until implementation and verification are complete.

The threat model must be updated as the application evolves. No security control should be described as complete solely because it is listed as a mitigation.

### Latest verified automated test baseline (2026-11-12)

- Tests run: 88
- Failures: 0
- Errors: 0
- Skipped: 0
- Maven result: BUILD SUCCESS
- Command: `mvn clean test`
- Verification time: 15:13 IST
- Frontend lint: 0 errors, 0 warnings (`npm run lint`)
- Frontend build: SUCCESS (`npm run build`)

The complete test suite passed on November 12, 2026.

The suite includes service-level tests, API-level security tests, PostgreSQL integration tests, role authorization tests, registration security tests, auditor reporting tests, privileged account initialization tests, administrative reconciliation tests, recipient account lookup tests, and account-number transfer tests.

Passing tests demonstrate the behavior covered by those tests. They do not establish that every possible threat has been eliminated.