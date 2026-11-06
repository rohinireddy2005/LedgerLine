# LedgerLine - AI Development Prompt Log

Project: LedgerLine
Date: 2026-11-06

This document records AI assistance used during development.
All implementation decisions and code are reviewed and tested by the developer.

## Entry 1 - Backend Foundation

Date: 2026-11-06

**What was asked:**
How to establish the Spring Boot backend foundation for LedgerLine.

**Tool output:**
Spring Boot project structure, configuration guidance, and Java implementation.

**What was wrong:**
Initial project setup required verification of dependencies, database configuration, and application startup.

**What was done instead:**
Configured the backend and verified compilation and database connectivity.

**Commit reference:**
9617633 - Initialize LedgerLine backend with JWT authentication.

## Entry 2 - Registration and Authentication

Date: 2026-11-06

**What was asked:**
How to implement user registration, password hashing, login authentication, and JWT generation.

**Tool output:**
Registration service, authentication service, DTOs, JWT service, and Spring Security configuration.

**What was wrong:**
Authentication configuration required correction and testing.

**What was done instead:**
Used BCrypt password hashing, JWT authentication, and stateless security configuration.

**Commit reference:**
9617633 - Initialize LedgerLine backend with JWT authentication.

## Entry 3 - Account Creation

Date: 2026-11-06

**What was asked:**
How to create secure user-owned accounts with unique account numbers.

**Tool output:**
Account entity, repository, service, controller, and response DTO.

**What was wrong:**
Account ownership and initial account values needed verification.

**What was done instead:**
Implemented server-generated account numbers, zero initial balance, INR currency, and ACTIVE status. Verified account creation through the API.

**Commit reference:**
eab56e3 - Add secure account management and ownership checks.

## Entry 4 - Authentication and Access Control

Date: 2026-11-06

**What was asked:**
How to prevent unauthenticated users from accessing account endpoints.

**Tool output:**
Spring Security authorization configuration and API testing guidance.

**What was wrong:**
Unauthenticated requests initially returned HTTP 403 instead of the intended HTTP 401.

**What was done instead:**
Configured an HTTP 401 authentication entry point and verified the unauthenticated API response.

**Commit reference:**
eab56e3 - Add secure account management and ownership checks.

## Entry 5 - Account Ownership Verification

Date: 2026-11-06

**What was asked:**
How to ensure one account holder cannot access another account holder's account.

**Tool output:**
Ownership-based repository query and API testing guidance.

**What was wrong:**
The initial API response appeared to return HTTP 401. Backend logs were inspected to identify the actual result.

**What was done instead:**
Verified that account retrieval checks both account ID and authenticated owner ID. Backend logs confirmed HTTP 404 for an account belonging to another user.

**Commit reference:**
eab56e3 - Add secure account management and ownership checks.
