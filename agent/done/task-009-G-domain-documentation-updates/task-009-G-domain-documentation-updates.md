# Task: Domain Documentation Updates

```yaml
id: task-009-G-domain-documentation-updates
title: Domain documentation updates for user types
status: done
priority: medium
type: documentation
architecture: not_requested
retry_count: 0
created_at: 2026-03-12
requested_by: human
parent_task: task-009-user-types-and-guest-access
areas:
  - domain-brain
flows:
  - user_authentication
  - menu_browsing
  - order_submission
dependencies:
  - task-009-A-database-schema-changes
  - task-009-B-application-token-pool
  - task-009-C-guest-user-creation
  - task-009-D-token-claim-validation-changes
  - task-009-E-backend-service-startup-auth
  - task-009-F-orders-client-guest-login
validation:
  - domain-brain/entities/user-account.md reflects new fields and client types
  - domain-brain/entities/access-token.md reflects new claims and token lifetimes
  - domain-brain/flows/user-authentication.md describes guest and application auth flows
  - domain-brain/invariants.md includes new invariants
  - domain-brain/glossary.md includes new terms
  - domain-brain/edge-cases.md includes new scenarios
  - flow-index.yaml includes new code paths
  - All documentation is consistent with the implemented code
```

## Summary

Update all domain-brain documentation files and `flow-index.yaml` to reflect the implemented user types, guest access flow, application authentication, and related changes. This task runs after all implementation tasks (A-F) are complete and should document the actual implemented behavior.

## Requirements

### domain-brain/entities/user-account.md
- Add `clientType` field with description of the `ClientType` enum (`REGISTERED_USER`, `GUEST_USER`, `APPLICATION`)
- Add `displayName` field (nullable, required for GUEST_USER)
- Add `applicationId` field (nullable, set for APPLICATION users)
- Add `lastActiveAt` field (tracks last login/token acquisition)
- Document that `passwordHash` is now nullable (NULL for GUEST_USER)
- Describe each client type and its characteristics

### domain-brain/entities/access-token.md
- Add `clientType` claim to the token structure
- Add `displayName` claim (present for GUEST_USER tokens)
- Document the 24-hour lifetime for guest tokens (configurable)
- Document the 1-hour lifetime for application tokens
- Document backward compatibility: tokens without `clientType` are treated as `REGISTERED_USER`

### domain-brain/flows/user-authentication.md
- Add new section: Guest Authentication Flow
  - Terminal user enters name -> orders-client calls guest creation endpoint with app token -> 24-hour JWT issued
  - Include the sequence diagram from arch doc section 5.2
- Add new section: Application Authentication Flow
  - Service calls application token endpoint with name + secret -> pool user assigned -> 1-hour JWT issued
  - Include the pool mechanics description
  - Document the auto-refresh pattern (80% of expiry)
- Update existing registered user flow section with `clientType` in token claims
- Document that login rejects non-REGISTERED_USER accounts

### domain-brain/invariants.md
- Add: Guest user creation requires an authenticated APPLICATION caller
- Add: Application token pool respects max_pool_size per application
- Add: Guest tokens expire in 24 hours (configurable)
- Add: Guest users are archived (disabled) after 7 days (configurable)
- Add: password_hash is nullable; NULL only for GUEST_USER and APPLICATION users
- Add: Application pool user acquisition uses database-level locking (FOR UPDATE)
- Add: X-Service-Token is retained only for the validate endpoint; all other inter-service calls use Bearer JWT

### domain-brain/glossary.md
- Add: ClientType -- enum distinguishing REGISTERED_USER, GUEST_USER, APPLICATION
- Add: GuestUser -- walk-in customer at a terminal; created on demand with display name
- Add: ApplicationUser -- backend service instance authenticated via application name + secret
- Add: ApplicationTokenPool -- pool of lazily-created users for application instances, with inactive reclamation
- Add: DisplayName -- human-readable name for guest users, shown on orders

### domain-brain/edge-cases.md
- Add: Application token pool exhaustion (all pool slots active, max size reached -> 503)
- Add: Concurrent application token acquisition (FOR UPDATE prevents duplicate assignment)
- Add: Guest token expiry at terminal (guest must re-enter name)
- Add: Application startup when users-service unavailable (exponential backoff retry)
- Add: Backward compatibility for tokens without clientType claim

### flow-index.yaml
- Add new code paths for the `user_authentication` flow:
  - `apps/orders-client/src/features/auth/appToken.ts`
  - `apps/users-service/src/main/kotlin/.../api/AuthController.kt` (new endpoints)
  - `apps/menu-service/src/main/java/.../application/StartupAuthClient.java`
  - `apps/orders-service/src/main/kotlin/.../application/StartupAuthClient.kt`
- Update any existing paths that changed
- Add paths for guest-related order submission changes if applicable

### OpenAPI Specs
- Verify `apps/users-service/api/openapi.yaml` is up to date with all new endpoints and response schemas (should have been updated in Tasks B, C, D -- verify consistency)
- Verify `apps/orders-service/api/openapi.yaml` reflects the extended `SubmitOrderResponse`

## Acceptance Criteria

- All domain-brain files accurately describe the implemented system with three client types
- No contradictions between documentation and implemented code
- `flow-index.yaml` references all new source files involved in authentication flows
- Glossary terms are complete for all new concepts
- Invariants cover all critical rules of the new auth system
- Edge cases document all failure/boundary scenarios identified in the architecture

## Constraints

- Follow `AGENTS.md` rules
- Documentation must reflect ACTUAL implemented behavior (read the code, don't just copy from the architecture doc)
- Preserve the existing format and style of each domain-brain file
- Keep documentation concise and factual
- Do not add speculative or future features

## Context

- Architecture design: `agent/tasks/task-009-user-types-and-guest-access.arch.md` (section 13)
- Parent task: `agent/tasks/task-009-user-types-and-guest-access.md`
- Related files:
  - `domain-brain/entities/user-account.md`
  - `domain-brain/entities/access-token.md`
  - `domain-brain/flows/user-authentication.md`
  - `domain-brain/flows/menu-browsing.md`
  - `domain-brain/flows/order-submission.md`
  - `domain-brain/invariants.md`
  - `domain-brain/glossary.md`
  - `domain-brain/edge-cases.md`
  - `domain-brain/README.md`
  - `flow-index.yaml`
  - `apps/users-service/api/openapi.yaml`
  - `apps/orders-service/api/openapi.yaml`
- Risks or dependencies: depends on all implementation tasks (A-F) being complete. Documentation should be based on the actual code, not just the architecture design.

## Out of Scope

- Code changes (this is documentation only)
- Creating new domain-brain files (update existing ones)
- Architecture document updates (the arch doc is a design artifact, not runtime documentation)

## Notes for Agents

- First visible chat message must identify the current role
- Append audit entries to `agent/tasks/task-009-user-types-and-guest-access.agents-audit.md`
- Read the ACTUAL implemented code before writing documentation. The implementation may have deviated from the architecture doc in minor ways -- document what was actually built.
- When updating `flow-index.yaml`, verify the exact file paths exist in the codebase.
- Keep the style consistent with existing content in each file. Read the current content first and match the heading levels, list formats, and level of detail.
- This task should be relatively quick since most of the content can be derived from the architecture document and the implemented code. The main work is adapting it to fit the existing documentation format.
