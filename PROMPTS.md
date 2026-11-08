# LedgerLine - AI Development Prompt Log

**Project:** LedgerLine

**Purpose:** This document records AI assistance used during development. All implementation decisions and generated code are reviewed, modified where necessary, and tested by the developer.

## Entry 1 - Backend Foundation

**Date:** 2026-11-06

**What was asked:**

How to establish the Spring Boot backend foundation for LedgerLine.

**Tool output:**

Spring Boot project structure, configuration guidance, and Java implementation.

**What was wrong:**

Initial project setup required verification of dependencies, database configuration, and application startup.

**What was done instead:**

Configured the backend and verified compilation and database connectivity.

**Commit reference:**

`9617633` - Initialize LedgerLine backend with JWT authentication.

## Entry 2 - Registration and Authentication

**Date:** 2026-11-06

**What was asked:**

How to implement user registration, password hashing, login authentication, and JWT generation.

**Tool output:**

Registration service, authentication service, DTOs, JWT service, and Spring Security configuration.

**What was wrong:**

Authentication configuration required correction and testing.

**What was done instead:**

Used BCrypt password hashing, JWT authentication, and stateless security configuration.

**Commit reference:**

`9617633` - Initialize LedgerLine backend with JWT authentication.

## Entry 3 - Account Creation

**Date:** 2026-11-06

**What was asked:**

How to create secure user-owned accounts with unique account numbers.

**Tool output:**

Account entity, repository, service, controller, and response DTO.

**What was wrong:**

Account ownership and initial account values needed verification.

**What was done instead:**

Implemented server-generated account numbers, zero initial balance, INR currency, and ACTIVE status. Verified account creation through the API.

**Commit reference:**

`eab56e3` - Add secure account management and ownership checks.

## Entry 4 - Authentication and Access Control

**Date:** 2026-11-06

**What was asked:**

How to prevent unauthenticated users from accessing account endpoints.

**Tool output:**

Spring Security authorization configuration and API testing guidance.

**What was wrong:**

Unauthenticated requests initially returned HTTP 403 instead of the intended HTTP 401.

**What was done instead:**

Configured an HTTP 401 authentication entry point and verified the unauthenticated API response.

**Commit reference:**

`eab56e3` - Add secure account management and ownership checks.

## Entry 5 - Account Ownership Verification

**Date:** 2026-11-06

**What was asked:**

How to ensure one account holder cannot access another account holder's account.

**Tool output:**

Ownership-based repository query and API testing guidance.

**What was wrong:**

The initial API response appeared to return HTTP 401. Backend logs were inspected to identify the actual result.

**What was done instead:**

Verified that account retrieval checks both account ID and authenticated owner ID. Backend logs confirmed HTTP 404 for an account belonging to another user.

**Commit reference:**

`eab56e3` - Add secure account management and ownership checks.

## Entry 6 - Automated Security and Ownership Testing

**Date:** 2026-11-06

**What was asked:**

How to write automated tests for HTTP security rules, public authentication endpoints, and account access restrictions.

**Tool output:**

Spring Boot MockMvc test structure and test cases for security configuration and account service ownership behavior.

**What was wrong:**

The security rules needed automated HTTP-level verification in addition to earlier manual API testing.

**What was done instead:**

Added four MockMvc security tests covering the public health endpoint, unauthenticated account access, registration, and login. The complete Maven test suite at that stage contained eight tests, all passing with zero failures and zero errors.

**Commit reference:**

`bb59e2a` - Add automated security and account ownership tests.

## Entry 7 - Money Movement and Transaction Integrity

**Date:** 2026-11-07

**What was asked:**

How to implement deposits, withdrawals, and transfers while protecting account balances and recording transaction history.

**Tool output:**

Guidance for transaction services, repository locking, validation, transaction records, ledger entries, and balance integrity checks.

**What was wrong:**

Money movement required careful handling of account ownership, account status, available balances, currency compatibility, and concurrent updates. Initial implementations and test configurations required debugging.

**What was done instead:**

Implemented transaction-service checks for ownership, account status, sufficient funds, currency compatibility, and maximum balance. Added account locking and transaction/ledger persistence within database transactions. Later PostgreSQL integration tests verified financial persistence and concurrent withdrawal behavior.

**Commit reference:**

`e37f752` - Implement secure financial transactions and ledger.

## Entry 8 - Transaction Security and Edge-Case Testing

**Date:** 2026-11-07

**What was asked:**

How to test transaction failures and security edge cases in addition to successful money movements.

**Tool output:**

JUnit and Mockito test guidance for transaction-service behavior, account restrictions, and ledger access restrictions.

**What was wrong:**

Initial test execution exposed an unnecessary Mockito stubbing issue. The test setup needed to be narrowed to the dependencies actually used by the test.

**What was done instead:**

Corrected the test setup and added transaction tests covering inactive accounts, insufficient funds, invalid amounts, currency mismatch, maximum balance, idempotency-key validation, ownership restrictions, and ledger access restrictions. The complete Maven test suite at that stage reported 25 tests, zero failures, zero errors, and zero skipped tests.

**Commit reference:**

`e37f752` - Implement secure financial transactions and ledger.

## Entry 9 - PostgreSQL Financial Integrity Integration Testing

**Date:** 2026-11-08

**What was asked:**

How to verify financial integrity against a real PostgreSQL database instead of relying only on mocked service tests.

**Tool output:**

Guidance for PostgreSQL integration testing, concurrent transaction verification, idempotency testing, ledger immutability, money conservation, and cross-user access restrictions.

**What was wrong:**

Earlier service-level tests alone could not establish that database transactions, locking, constraints, and ledger protections behaved correctly against PostgreSQL. Integration test configuration also required debugging.

**What was done instead:**

Configured a separate PostgreSQL test database and added integration tests covering concurrent withdrawals, repeated idempotent requests, transfers, cross-user access restrictions, and database-level ledger immutability. Verified that the database rejects ledger UPDATE and DELETE operations through a trigger. The complete test suite subsequently passed with 30 tests and zero failures, errors, or skipped tests.

**Commit reference:**

`216e63f` - Add PostgreSQL financial integrity integration tests.

## Entry 10 - JWT Validation and Registration Security

**Date:** 2026-11-08

**What was asked:**

How to test invalid and expired JWT rejection and prevent public registration from assigning privileged roles or creating duplicate accounts.

**Tool output:**

MockMvc security test guidance for malformed JWTs, expired JWTs, registration role restrictions, and duplicate registration attempts.

**What was wrong:**

Security behavior needed to be verified through the actual JWT filter and registration API rather than relying only on unit-level tests. The JWT tests required a token signed with the configured test secret and an expiration time in the past.

**What was done instead:**

Added API-level tests using bearer tokens to verify that invalid and expired JWTs receive HTTP 401. Added registration tests verifying that public registration always creates an ACCOUNT_HOLDER and that duplicate email registration, including different email letter casing, receives HTTP 409. Both test classes passed independently.

**Commit reference:**

b558b66 - Enforce role-based API authorization and expand security tests.

## Entry 11 - Role-Based API Authorization

**Date:** 2026-11-08

**What was asked:**

How to enforce separate permissions for ACCOUNT_HOLDER, ADMIN, and AUDITOR roles on protected API endpoints.

**Tool output:**

Spring Security role-matcher configuration and API-level tests using real JWTs generated for database users with different roles.

**What was wrong:**

The initial tests showed that ADMIN and AUDITOR users could access account-holder APIs because the existing security configuration checked authentication but did not enforce role-specific authorization. The first test implementation also used an incorrect AutoConfigureMockMvc import for Spring Boot 4, which caused a compilation error.

**What was done instead:**

Corrected the Spring Boot 4 test import, added tests for all three roles, and used the initial failures to identify the authorization gap. Updated SecurityConfig to require the ACCOUNT_HOLDER role for existing account and transaction APIs. Verified that account holders receive HTTP 200 while ADMIN and AUDITOR receive HTTP 403 for the tested account API. The three role tests passed.

Dedicated administrative management and auditor reporting endpoints remain future work.

**Commit reference:**

b558b66 - Enforce role-based API authorization and expand security tests.

---

## Development Note

Test counts and commit references represent the state at the time each entry was recorded. Pending work and uncommitted milestones are identified explicitly rather than presented as completed or committed.

**Latest verified automated test result (2026-11-08):**

- Tests run: 37
- Failures: 0
- Errors: 0
- Skipped: 0
- Maven result: BUILD SUCCESS

All AI-generated suggestions and code are subject to developer review, modification, and testing. Passing tests establish only the behavior covered by those tests; they do not guarantee the absence of all security vulnerabilities. The threat model must be reviewed and updated as the application evolves. A security control must not be considered complete solely because it is documented as a mitigation; its implementation and effectiveness must be verified.