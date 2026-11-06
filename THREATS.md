# LedgerLine - Threat Model

## 1. Project Overview

LedgerLine is a secure money movement application that provides account management, financial transactions, and an auditable transaction ledger.

The application uses React, Java, Spring Boot, Spring Security, JWT, and MySQL.

## 2. Assets to Protect

- User credentials and personal information
- Authentication tokens
- Bank account details
- Account balances
- Transaction records
- Ledger entries
- Administrative and auditor access

## 3. Identified Threats and Mitigations

### Threat 1 - Unauthorized Access

**Risk:** An unauthenticated person may attempt to access protected API endpoints.

**Mitigation:**
- Require authentication for protected endpoints.
- Use JWT-based authentication.
- Return HTTP 401 for unauthenticated requests.
- Keep the application stateless.

### Threat 2 - Broken Object-Level Authorization

**Risk:** One account holder may attempt to access another user's account.

**Mitigation:**
- Derive the authenticated user's identity from the security context.
- Verify account ownership on every account-specific request.
- Never trust an owner ID supplied by the client.
- Return HTTP 404 when an account does not belong to the authenticated user.

### Threat 3 - Password Exposure

**Risk:** Stored passwords may be exposed if the database is compromised.

**Mitigation:**
- Hash passwords using BCrypt.
- Never store plaintext passwords.
- Never return passwords in API responses.
- Keep credentials outside source control.

### Threat 4 - Token Misuse

**Risk:** A stolen or expired JWT may be used to attempt unauthorized access.

**Mitigation:**
- Sign JWTs using a securely generated secret.
- Validate token signatures and expiration.
- Use a limited token lifetime.
- Keep JWT secrets outside the repository.

### Threat 5 - Duplicate Financial Requests

**Risk:** Repeated requests may accidentally cause the same financial operation to be processed more than once.

**Mitigation:**
- Implement idempotency keys for financial operations.
- Store and validate request identifiers.
- Ensure repeated requests do not create duplicate ledger entries.

### Threat 6 - Concurrent Transactions

**Risk:** Simultaneous financial operations may produce incorrect account balances.

**Mitigation:**
- Use database transactions.
- Apply appropriate concurrency control.
- Validate available balances before withdrawals and transfers.
- Test simultaneous transaction scenarios.

### Threat 7 - Unauthorized Balance Modification

**Risk:** A client may attempt to manipulate account balances directly.

**Mitigation:**
- Never accept a client-provided balance during account creation.
- Perform balance changes only through authorized backend services.
- Record financial changes in the ledger.
- Keep ledger entries append-only.

### Threat 8 - Financial Record Tampering

**Risk:** Transaction records may be modified or deleted without authorization.

**Mitigation:**
- Use an append-only ledger design.
- Do not provide normal application operations to edit or delete completed ledger entries.
- Record transaction details and outcomes.
- Reconcile account balances against ledger records.

### Threat 9 - Privilege Escalation

**Risk:** A normal account holder may attempt to access administrator or auditor functionality.

**Mitigation:**
- Define separate ADMIN, ACCOUNT_HOLDER, and AUDITOR roles.
- Enforce role-based authorization on protected endpoints.
- Never accept a role directly from public registration requests.

### Threat 10 - Sensitive Information Exposure

**Risk:** API responses, logs, or repository files may expose passwords, tokens, or secrets.

**Mitigation:**
- Return dedicated response DTOs.
- Avoid logging credentials and authentication tokens.
- Exclude secret configuration files from Git.
- Review API responses before deployment.

## 4. Security Testing Plan

The following scenarios must be tested:

- Unauthenticated requests to protected endpoints.
- Invalid and expired JWTs.
- Access to another user's account.
- Duplicate registration attempts.
- Invalid input validation.
- Repeated financial requests.
- Withdrawals exceeding available balances.
- Concurrent financial operations.
- Attempts to access restricted administrative functionality.
- Ledger and balance consistency.

## 5. Security Principles

LedgerLine follows these principles:

- Least privilege
- Defense in depth
- Server-side validation
- Ownership-based authorization
- Secure password storage
- Transaction integrity
- Append-only financial records
- Auditability

## 6. Implementation Status

This document identifies intended threats and mitigations. Each control must be implemented and verified through code review and testing before being described as complete.

Unimplemented controls will remain marked as pending until verified.