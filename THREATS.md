
# LedgerLine - Threat Model

## 1. Project Overview

LedgerLine is a money movement application that provides account management, financial transactions, and an auditable transaction ledger.

The backend uses Java 21, Spring Boot, Spring Security, JWT authentication, Spring Data JPA, and PostgreSQL. The planned frontend uses React and Vite.

This threat model identifies important assets, potential security threats, implemented mitigations, and controls that still require implementation or verification.

## 2. Assets to Protect

- User credentials and personal information
- Authentication tokens
- Account details and ownership information
- Account balances
- Transaction records
- Ledger entries
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

**Implementation status:** Implemented and tested through API-level security tests. Unauthenticated requests to protected account APIs are rejected with HTTP 401.

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

**Implementation status:** BCrypt password hashing with strength 12 and dedicated response DTOs are implemented. Environment-based secret configuration is used. Final deployment secret-management and repository reviews remain necessary.

### Threat 4 - Token Misuse

**Risk:** A stolen, invalid, or expired JWT may be used to attempt unauthorized access.

**Mitigations:**

- Sign JWTs using a securely generated secret.
- Validate token signatures and expiration.
- Use a limited token lifetime.
- Keep JWT secrets outside the repository.
- Reject invalid and expired tokens.

**Implementation status:** JWT authentication, signature validation, expiration validation, and environment-based secret configuration are implemented. Automated API-level tests verify that malformed and expired JWTs receive HTTP 401.

### Threat 5 - Duplicate Financial Requests

**Risk:** Repeated requests may accidentally process the same financial operation more than once.

**Mitigations:**

- Require idempotency keys for financial operations.
- Associate request identifiers with the authenticated user.
- Enforce uniqueness of the initiator and idempotency-key combination in PostgreSQL.
- Return the original transaction result for a repeated request with the same key.
- Reject reuse of a key with different transaction details.

**Implementation status:** Idempotency handling and the database uniqueness constraint are implemented. PostgreSQL integration tests verify that repeated requests do not create additional transactions or ledger entries and that reusing a key with different transaction details is rejected. Concurrent duplicate-request race behavior remains pending dedicated testing.

### Threat 6 - Concurrent Transactions

**Risk:** Simultaneous financial operations may produce incorrect balances or inconsistent transaction records.

**Mitigations:**

- Use database transactions.
- Apply pessimistic database locking where required.
- Lock transfer accounts in a consistent order.
- Validate available balances before withdrawals and transfers.
- Test simultaneous transaction scenarios against PostgreSQL.

**Implementation status:** Transaction boundaries and pessimistic locking are implemented. PostgreSQL integration tests execute simultaneous withdrawals and verify that only one withdrawal succeeds when the combined withdrawal amount exceeds the available balance. The final balance and ledger entries are verified.

### Threat 7 - Unauthorized Balance Modification

**Risk:** A client may attempt to manipulate account balances directly.

**Mitigations:**

- Never accept a client-provided balance during account creation.
- Perform balance changes only through authorized backend services.
- Record financial changes through transaction and ledger operations.
- Apply database constraints to prevent negative account balances.

**Implementation status:** Server-controlled account creation and backend transaction processing are implemented. PostgreSQL check constraints prevent negative account balances. Additional reconciliation and production database permission reviews remain pending.

### Threat 8 - Financial Record Tampering

**Risk:** Transaction records or ledger entries may be modified or deleted without authorization.

**Mitigations:**

- Design the ledger as an append-only financial record.
- Avoid normal application operations that edit or delete completed ledger entries.
- Record transaction details and outcomes.
- Use database-level protections against ledger updates and deletions.
- Reconcile account balances against ledger records.

**Implementation status:** PostgreSQL database-level protections are implemented using a trigger that rejects UPDATE and DELETE operations on ledger entries. An integration test verifies that these operations are rejected and that the original ledger entry remains unchanged. Database check constraints also protect positive transaction amounts, positive ledger entry amounts, and nonnegative balances.

A sufficiently privileged database owner can still modify or disable database protections. Independent reconciliation, database privilege hardening, and additional tamper-evidence mechanisms remain pending.

### Threat 9 - Privilege Escalation

**Risk:** A normal account holder may attempt to access administrator or auditor functionality, or assign themselves a privileged role.

**Mitigations:**

- Define separate ADMIN, ACCOUNT_HOLDER, and AUDITOR roles.
- Enforce role-based authorization on protected endpoints.
- Never accept a role directly from public registration requests.
- Verify authorization independently of frontend visibility.
- Keep ownership checks in addition to role checks.

**Implementation status:** All three roles are defined. Public registration always creates an ACCOUNT_HOLDER, and automated tests verify that privileged roles cannot be assigned through the registration API.

The existing account and transaction APIs require the ACCOUNT_HOLDER role. API-level tests verify that ADMIN and AUDITOR tokens receive HTTP 403 when accessing these account-holder endpoints.

Dedicated administrative management endpoints and read-only auditor reporting endpoints have not yet been implemented. Their permissions and audit workflows remain pending.

### Threat 10 - Sensitive Information Exposure

**Risk:** API responses, logs, or repository files may expose passwords, tokens, or secrets.

**Mitigations:**

- Return dedicated response DTOs.
- Avoid logging credentials and authentication tokens.
- Exclude secret configuration files from Git.
- Use environment variables for sensitive configuration.
- Review API responses and application logs before deployment.

**Implementation status:** Dedicated response DTOs and environment-based configuration for database credentials and JWT secrets are implemented. Final logging review, repository secret scanning, and deployment configuration review remain pending.

## 4. Security Testing Plan

The following scenarios are included in the security verification plan:

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
| Withdrawals exceeding available balances | Implemented and tested |
| Inactive account restrictions | Implemented and tested |
| Currency mismatch | Implemented and tested |
| Maximum balance restrictions | Implemented and tested |
| Concurrent withdrawals against PostgreSQL | Implemented and tested |
| Database-level ledger UPDATE/DELETE protection | Implemented and tested |
| Concurrent duplicate idempotency requests | Pending |
| Ledger-to-account-balance reconciliation | Pending |
| Dedicated ADMIN management APIs | Pending |
| Dedicated AUDITOR read-only APIs | Pending |
| Production database privilege hardening | Pending |
| Final logging and secret-exposure review | Pending |

**Current automated test baseline (2026-11-08):**

The complete Maven test suite contains 37 tests, with zero failures, zero errors, and zero skipped tests.

The tests include service-level tests, API-level security tests, and PostgreSQL integration tests.

Passing tests demonstrate the behavior covered by those tests. They do not establish that every possible threat has been eliminated.

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
- Explicit identification of pending security controls

## 6. Implementation Status and Review

This document distinguishes implemented controls from planned or partially verified controls.

A control is described as implemented and tested only when supported by the current code and relevant test results.

The following areas require further work:

1. Concurrent duplicate idempotency request testing.
2. Ledger-to-account-balance reconciliation.
3. Dedicated ADMIN management endpoints.
4. Dedicated AUDITOR read-only reporting endpoints.
5. Production database privilege hardening.
6. Final secret-management, logging, and deployment review.
7. Additional tamper-evidence and audit verification.

Unimplemented or unverified controls remain pending until implementation and verification are complete.

The threat model must be updated as the application evolves. No security control should be described as complete solely because it is listed as a mitigation.
