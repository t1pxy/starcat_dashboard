# Code Refactoring Rules

This project uses:

* Next.js
* React
* TypeScript
* Microsoft SQL Server (MSSQL)

The primary goal is to improve code quality, maintainability, readability, reliability, and performance while preserving existing functionality.

---

# Core Principle

**Refactor safely. Preserve behavior.**

Do not change business behavior unless explicitly requested.

Before modifying code, understand how the existing implementation works.

Prefer small, focused, incremental refactors over large rewrites.

---

# 1. Preserve Existing Behavior

Do NOT intentionally change:

* Business logic
* User workflows
* API contracts
* Database schema
* Database data
* Authentication
* Authorization
* Existing functionality

Unless explicitly requested.

If the existing behavior appears incorrect, do not silently change it.

Report the issue and explain the potential impact.

---

# 2. Refactoring Goals

Look for:

* Duplicate code
* Dead code
* Unused imports
* Unused variables
* Large functions
* Large components
* Large files
* Deep nesting
* Complex conditionals
* Poor naming
* Magic numbers
* Magic strings
* Repeated logic
* Unnecessary state
* Unnecessary effects
* Unnecessary abstractions
* Tight coupling
* Poor separation of concerns
* Inconsistent error handling
* Weak TypeScript types
* Unsafe type assertions
* Poor data fetching patterns
* Performance problems
* Security problems

---

# 3. Clean Code

Follow these principles:

* KISS
* DRY
* YAGNI
* SOLID where appropriate
* Separation of concerns
* Single Responsibility

Do not apply these principles mechanically.

Avoid over-engineering.

Prefer simple and readable code over clever abstractions.

---

# 4. Next.js

Follow modern Next.js conventions.

Prefer:

* Server Components by default
* Client Components only when necessary
* Server-side data fetching when appropriate
* Clear separation between server and client code
* Reusable components
* TypeScript
* Proper error handling
* Proper loading states

Check for:

* Unnecessary `"use client"`
* Unnecessary `useEffect`
* Unnecessary `useState`
* Duplicate data fetching
* Client-side logic that could run on the server
* Excessive prop drilling
* Large client bundles

Do not convert Server Components to Client Components without a clear reason.

---

# 5. React

Check:

* Component responsibility
* Component size
* Props design
* State management
* Hooks usage
* Re-render behavior
* Conditional rendering
* Event handlers
* Derived state

Avoid:

* State that can be derived
* Effects that are not necessary
* Duplicate state
* Prop drilling when it creates significant complexity
* Components doing too many unrelated things

Do not introduce global state unless necessary.

---

# 6. TypeScript

Prefer strong types.

Avoid unnecessary:

```ts
any
```

Avoid unnecessary:

```ts
as SomeType
```

Prefer:

* Interfaces/types
* Type narrowing
* Discriminated unions where useful
* Explicit API response types
* Proper nullable handling

Do not weaken types just to make TypeScript errors disappear.

---

# 7. Data Fetching

Inspect:

* Duplicate requests
* Unnecessary requests
* Fetching data that is not used
* Missing error handling
* Missing loading handling
* Incorrect caching
* Incorrect revalidation
* Sequential requests that could be parallelized

Do not change data-fetching behavior without understanding its impact.

---

# 8. MSSQL

Treat the database as production-critical.

Never perform destructive operations during refactoring.

Do NOT:

* DROP tables
* TRUNCATE tables
* DELETE production data
* ALTER schema
* Modify production records

unless explicitly authorized.

When reviewing database-related code, check for:

* SELECT *
* Duplicate queries
* N+1 queries
* Inefficient joins
* Unnecessary queries
* Missing pagination
* Poor filtering
* Poor sorting
* Unnecessary data retrieval

Do not change database schema as part of normal refactoring.

---

# 9. Performance

Look for real performance problems.

Check:

* Unnecessary React re-renders
* Large Client Components
* Large JavaScript bundles
* Duplicate data fetching
* Unnecessary database queries
* Expensive calculations
* Large lists
* Large payloads
* Unnecessary serialization
* Unnecessary client-side processing

Do not prematurely optimize.

Every optimization should have a clear reason.

---

# 10. Error Handling

Check consistency of:

* API errors
* Database errors
* Validation errors
* UI errors
* Unexpected exceptions

Do not expose:

* SQL errors
* Stack traces
* Internal implementation details
* Sensitive information

to end users.

---

# 11. Security

Check for:

* SQL injection
* XSS
* Sensitive information exposure
* Hardcoded secrets
* Unsafe input handling
* Unsafe SQL construction
* Authentication issues
* Authorization issues

Never commit:

* Passwords
* API keys
* Database credentials
* Tokens
* Secrets

If a security issue is found, report its severity:

* Critical
* High
* Medium
* Low

---

# 12. Architecture

Do not introduce architectural patterns without justification.

Before creating:

* Services
* Repositories
* Managers
* Factories
* Custom hooks
* Global state
* Utility layers

check whether the abstraction actually reduces complexity.

Prefer the simplest architecture that fits the project.

---

# 13. File and Component Structure

Look for opportunities to:

* Split large components
* Extract reusable components
* Extract utility functions
* Extract shared types
* Separate UI from data logic
* Separate business logic from presentation

But avoid splitting code into many tiny files without a meaningful benefit.

---

# 14. Naming

Improve unclear names.

Prefer names that describe intent.

Bad:

```ts
data
x
temp
handleData
process
doSomething
```

Better:

```ts
devices
selectedDevice
deviceStatus
handleDeviceRefresh
calculateDeviceHealth
```

Do not rename public APIs or database fields unless necessary.

---

# 15. Duplication

Find duplicated:

* Components
* Functions
* Queries
* Validation
* Formatting
* Conditions
* Business logic

Extract shared logic only when duplication is meaningful.

Do not create abstractions for two trivial lines of code.

---

# 16. Refactoring Process

When asked to refactor:

## Phase 1 — Analyze

Inspect the project structure and relevant code.

Identify:

* Architecture
* Dependencies
* Main modules
* Code smells
* Technical debt
* Performance issues
* Security issues

Do not modify code yet.

## Phase 2 — Prioritize

Classify issues:

### Critical

Security, data corruption, severe bugs.

### High

Major maintainability, reliability, or performance problems.

### Medium

Meaningful code quality improvements.

### Low

Minor cleanup and style improvements.

## Phase 3 — Plan

Create a refactoring plan.

Prioritize high-value changes.

Avoid unrelated changes.

## Phase 4 — Implement

Refactor incrementally.

Keep each change focused.

Do not rewrite the entire project unless explicitly requested.

## Phase 5 — Verify

After changes:

* Run TypeScript checks
* Run ESLint
* Run tests
* Run build
* Review git diff
* Check for unintended behavior changes

---

# 17. Git Safety

Before large refactoring:

Check:

```bash
git status
```

Do not overwrite unrelated uncommitted changes.

Do not reset or delete user changes.

Do not run destructive Git commands unless explicitly requested.

Prefer small, reviewable changes.

---

# 18. What NOT to Do

Do not:

* Rewrite everything
* Change architecture unnecessarily
* Introduce unnecessary dependencies
* Change database schema
* Change API contracts
* Change business logic
* Remove code just because it looks unused without verifying it
* Optimize prematurely
* Replace working code with a different library without reason

---

# 19. Definition of Done

A refactoring is complete when:

* Existing functionality is preserved.
* Code is easier to understand.
* Duplication is reduced where appropriate.
* Complexity is reduced.
* Types are improved.
* Error handling is reasonable.
* Performance problems are addressed where justified.
* No unnecessary dependencies were added.
* TypeScript passes.
* ESLint passes.
* Tests pass when available.
* Build succeeds.
* Git diff contains only intended changes.

---

# 20. Final Report

After refactoring, report:

## Summary

What was improved.

## Files Changed

List modified files.

## Refactoring

Explain structural/code-quality improvements.

## Performance

Explain performance improvements.

## Security

Explain security findings and fixes.

## Behavior

Clearly state whether behavior changed.

If no intentional behavior changed:

> No intentional behavior changes.

## Verification

Report:

* TypeScript
* ESLint
* Tests
* Build

## Remaining Technical Debt

List issues that should be addressed later.

---

# Most Important Rules

1. Understand before changing.
2. Preserve existing behavior.
3. Refactor incrementally.
4. Keep changes focused.
5. Prefer simple solutions.
6. Avoid over-engineering.
7. Do not change database schema without approval.
8. Do not change business logic without approval.
9. Verify every significant change.
10. Optimize for maintainability and correctness.
