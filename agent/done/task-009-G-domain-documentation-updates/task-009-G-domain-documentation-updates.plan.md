# Implementation Plan

## Scope
Complete task-009-G by updating `domain-brain` and `flow-index.yaml` to match actual implemented behavior from tasks A-F (including completed task E and F).

## Current Gaps Found
- `domain-brain/invariants.md` is missing new auth-system invariants (guest creation caller type, pool locking/limits, guest retention window, scoped X-Service-Token rule).
- `domain-brain/glossary.md` lacks key terms (`ClientType`, `GuestUser`, `ApplicationUser`, `ApplicationTokenPool`, `DisplayName`).
- `domain-brain/edge-cases.md` lacks new auth/app-pool scenarios.
- `domain-brain/flows/user-authentication.md` still describes only registered flow; missing guest/application auth sections.
- `flow-index.yaml` lacks new auth paths (`orders-client appToken`, backend startup auth clients).
- `apps/orders-service/api/openapi.yaml` does not expose `userDisplayName` in `SubmitOrderResponse`.
- Minor encoding artifacts (`—`) exist in docs and will be normalized to plain ASCII punctuation.

## Planned Changes
1. Update `domain-brain/entities/user-account.md` for clarity and ASCII cleanup while preserving implemented semantics.
2. Update `domain-brain/entities/access-token.md` for guest/application token details and ASCII cleanup.
3. Expand `domain-brain/flows/user-authentication.md` with guest and application flow sections and current constraints.
4. Extend `domain-brain/invariants.md` with auth-system invariants from implemented code.
5. Extend `domain-brain/glossary.md` with task-009 terminology.
6. Extend `domain-brain/edge-cases.md` with auth pool/compatibility/startup cases.
7. Update `flow-index.yaml` to include new implemented authentication code paths.
8. Update `apps/orders-service/api/openapi.yaml` with `userDisplayName` in `SubmitOrderResponse`.
9. Create coder/test/review artifacts for task-009-G and set task status to `done`.
