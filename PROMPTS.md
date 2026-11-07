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

Implemented transaction-service checks for ownership, account status, sufficient funds, currency compatibility, and maximum balance. Added account locking and transaction/ledger persistence within database transactions. Verified transaction-service behavior through automated tests; database-level persistence and concurrency remain subject to further integration testing.

**Commit reference:**

Implementation and test milestone not yet committed as of 2026-11-07.

## Entry 8 - Transaction Security and Edge-Case Testing

**Date:** 2026-11-07

**What was asked:**

How to test transaction failures and security edge cases in addition to successful money movements.

**Tool output:**

JUnit and Mockito test guidance for transaction-service behavior, account restrictions, and ledger access.

**What was wrong:**

Initial test execution exposed an unnecessary Mockito stubbing issue. The test setup needed to be narrowed to the dependencies actually used by the test.

**What was done instead:**

Corrected the test setup and added transaction tests covering inactive accounts, insufficient funds, invalid amounts, currency mismatch, maximum balance, idempotency-key validation, ownership restrictions, and ledger access restrictions. The latest complete Maven test run on 2026-11-07 reported 25 tests, zero failures, zero errors, and zero skipped tests.

**Commit reference:**

Test milestone not yet committed as of 2026-11-07.

---

**Development note:** Test counts and commit references represent the state at the time each entry was recorded. Pending work and uncommitted milestones are identified explicitly rather than presented as completed or committed.