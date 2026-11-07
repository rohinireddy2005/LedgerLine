# LedgerLine - Threat Model

## 1. Project Overview

LedgerLine is a money movement application that provides account management, financial transactions, and an auditable transaction ledger.

The application uses React, Java, Spring Boot, Spring Security, JWT, and MySQL.

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

## 3. Identified Threats and Mitigations

### Threat 1 - Unauthorized Access

**Risk:** An unauthenticated person may attempt to access protected API endpoints.

**Mitigations:**

- Require authentication for protected endpoints.
- Use JWT-based authentication.
- Return HTTP 401 for unauthenticated requests.
- Keep the application stateless.

**Implementation status:** Implemented and tested through automated security tests.

### Threat 2 - Broken Object-Level Authorization

**Risk:** One account holder may attempt to access another user's account or financial records.

**Mitigations:**

- Derive the authenticated user's identity from the security context.
- Verify account ownership on account-specific requests.
- Never trust an owner ID supplied by the client.
- Return HTTP 404 when an account does not belong to the authenticated user.

**Implementation status:** Account ownership checks are implemented. Automated account ownership and ledger access tests have been added.

### Threat 3 - Password Exposure

**Risk:** Stored passwords may be exposed if the database is compromised.

**Mitigations:**

- Hash passwords using BCrypt.
- Never store plaintext passwords.
- Never return passwords in API responses.
- Keep credentials outside source control.

**Implementation status:** BCrypt password hashing and response DTO separation are implemented. Secret management and repository configuration must continue to be reviewed before deployment.

### Threat 4 - Token Misuse

**Risk:** A stolen, invalid, or expired JWT may be used to attempt unauthorized access.

**Mitigations:**

- Sign JWTs using a securely generated secret.
- Validate token signatures and expiration.
- Use a limited token lifetime.
- Keep JWT secrets outside the repository.

**Implementation status:** JWT authentication, signature validation, expiration configuration, and environment-based secret configuration are implemented. Additional invalid-token and expired-token tests remain part of security verification.

### Threat 5 - Duplicate Financial Requests

**Risk:** Repeated requests may accidentally process the same financial operation more than once.

**Mitigations:**

- Use idempotency keys for financial operations.
- Associate request identifiers with the authenticated user.
- Enforce uniqueness of the initiator and idempotency-key combination in the database.
- Ensure repeated requests do not create duplicate ledger entries.

**Implementation status:**
Idempotency handling and a database uniqueness constraint are implemented. Automated transaction tests cover idempotency behavior and missing idempotency keys. Concurrent duplicate-request behavior against the database remains pending integration testing.

### Threat 6 - Concurrent Transactions

**Risk:** Simultaneous financial operations may produce incorrect balances or inconsistent transaction records.

**Mitigations:**

- Use database transactions.
- Apply pessimistic database locking where required.
- Lock transfer accounts in a consistent order.
- Validate available balances before withdrawals and transfers.
- Test simultaneous transaction scenarios against the database.

**Implementation status:** Transaction boundaries and pessimistic account locking are implemented. Dedicated concurrent database integration tests are pending.

### Threat 7 - Unauthorized Balance Modification

**Risk:** A client may attempt to manipulate account balances directly.

**Mitigations:**

- Never accept a client-provided balance during account creation.
- Perform balance changes only through authorized backend services.
- Record financial changes through transaction and ledger operations.
- Restrict direct modification of financial data.

**Implementation status:** Server-controlled account creation and backend transaction processing are implemented. Further database-level safeguards require verification.

### Threat 8 - Financial Record Tampering

**Risk:** Transaction records or ledger entries may be modified or deleted without authorization.

**Mitigations:**

- Design the ledger as an append-only financial record.
- Avoid normal application operations that edit or delete completed ledger entries.
- Record transaction details and outcomes.
- Reconcile account balances against ledger records.
- Consider database-level controls to prevent unauthorized modification or deletion.

**Implementation status:** Ledger entries are created through the transaction service, and entity fields use non-updatable mappings. Database-level immutability and automated ledger-to-balance reconciliation are pending verification. Application-level restrictions alone do not guarantee that database records cannot be altered.

### Threat 9 - Privilege Escalation

**Risk:** A normal account holder may attempt to access administrator or auditor functionality.

**Mitigations:**

- Define separate ADMIN, ACCOUNT_HOLDER, and AUDITOR roles.
- Enforce role-based authorization on protected endpoints.
- Never accept a role directly from public registration requests.
- Verify authorization independently of frontend visibility.

**Implementation status:** The current role model includes ACCOUNT_HOLDER. Separate ADMIN and AUDITOR permissions and their authorization tests are pending.

### Threat 10 - Sensitive Information Exposure

**Risk:** API responses, logs, or repository files may expose passwords, tokens, or secrets.

**Mitigations:**

- Return dedicated response DTOs.
- Avoid logging credentials and authentication tokens.
- Exclude secret configuration files from Git.
- Use environment variables for sensitive configuration.
- Review API responses and application logs before deployment.

**Implementation status:** Dedicated response DTOs and environment-based secret configuration are implemented. Logging and repository secret-exposure checks remain part of the deployment review.

## 4. Security Testing Plan

The following scenarios are included in the security verification plan:

| Test scenario | Current status |
|---|---|
| Unauthenticated requests to protected endpoints | Implemented and tested |
| Account ownership restrictions | Implemented and tested |
| Ledger access restrictions | Implemented and tested |
| Invalid and expired JWTs | Further verification pending |
| Duplicate registration attempts | Requires verification |
| Invalid financial input validation | Implemented and tested |
| Repeated financial requests | Implemented and tested |
| Withdrawals exceeding available balances | Implemented and tested |
| Inactive account restrictions | Implemented and tested |
| Currency mismatch | Implemented and tested |
| Maximum balance restrictions | Implemented and tested |
| Concurrent financial operations against MySQL | Pending |
| ADMIN and AUDITOR authorization | Pending |
| Ledger and balance reconciliation | Pending |

**Current automated test baseline (2026-11-07):**

The complete Maven test suite contains 25 tests, with zero failures, zero errors, and zero skipped tests.

This test result represents the current automated test suite. It does not establish that every threat listed in this document has been fully mitigated.

## 5. Security Principles

LedgerLine follows these security principles:

- Least privilege
- Defense in depth
- Server-side validation
- Ownership-based authorization
- Secure password storage
- Transaction integrity
- Idempotent financial operations
- Append-only financial record design
- Auditability
- Explicit identification of pending security controls

## 6. Implementation Status and Review

This document distinguishes implemented controls from planned or partially verified controls.

A control is described as implemented and tested only when supported by the current code and relevant test results.

The following areas require further work:

1. Concurrent transaction integration testing against MySQL.
2. Dedicated invalid-token and expired-token tests.
3. ADMIN and AUDITOR role-based authorization.
4. Database-level ledger immutability safeguards.
5. Ledger-to-account-balance reconciliation.
6. Final secret-management, logging, and deployment review.

Unimplemented or unverified controls remain pending until implementation and verification are complete.

The threat model must be updated as the application evolves. No security control should be described as complete solely because it is listed as a mitigation.