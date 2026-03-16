# Review Report

## Final Decision
APPROVED_WITH_NOTES

## Summary

The implementation fully satisfies the task requirements. All 8 plan steps are completed, all 5 acceptance criteria are verified by tests, the state-machine architecture matches the source architecture design, security constraints are met (display token never in browser storage), and the footer is removed. One minor non-blocking code quality note exists (duplicated Refresh button JSX).

## Plan Compliance

### Completed steps
- Step 1: `displayAppAuthConfig` added to `shared/api/config.ts` with `VITE_DISPLAY_APP_NAME`/`VITE_DISPLAY_APP_SECRET` env var support and sensible defaults.
- Step 2: `AppTokenResponse` type and `acquireAppToken` function added to `features/auth/api.ts`, following the same pattern as `orders-client`.
- Step 3: `features/auth/appToken.ts` created as an in-memory display token manager with retry, refresh scheduling, and request deduplication. No browser storage usage.
- Step 4: `features/auth/session.ts` rewritten with `UiSession`/`UiMode` types, `PersistedInteractiveSession`/`PersistedDisplaySession` discriminated union, and `readPersistedSession`/`writeInteractiveSession`/`writeDisplaySession`/`clearSession` helpers. Display sessions persist only `{ mode: "display" }`.
- Step 5: `App.tsx` rewritten with 5-state machine (`landing`, `interactive_credentials`, `display_loading`, `interactive_board`, `display_board`), `computeInitialState()` for session restore, footer removed, mode chip in header, display board read-only (div cards, no detail panel, no commands).
- Step 6: `styles.css` updated — `.service-grid` footer styles removed, `.landing-screen`, `.landing-actions`, `.landing-btn`, `.mode-chip`, `.auth-form-actions` styles added.
- Step 7: `App.test.tsx` rewritten with 15 tests covering all planned scenarios (7a–7m).
- Step 8: Build and tests pass (`npm test` 15/15, `npm run build` succeeds).

### Missing steps
None.

### Unexpected scope changes
None. Changes are tightly scoped to the task.

## Domain Review

### Invariant checks
- "The main UI surface stays hidden until a valid mode and session are established" — enforced by the landing screen gate.
- "`staff-client` persists an explicit UI mode of `interactive` or `display`; only `interactive` may issue production commands" — enforced by the `isDisplay` guard in the board view and the read-only `<div>` order cards.
- "Customer-facing display mode must not expose production mutation controls or detailed order internals" — enforced by omitting the detail panel and command buttons in display mode.
- "Display-mode tokens kept in memory rather than browser storage" — confirmed by absence of `localStorage`/`sessionStorage` usage in `appToken.ts`.

### Domain-brain consistency
- `domain-brain/flows/user-authentication.md` already documents the staff display flow (steps 1–5 in "Staff Display Flow" section), mode-based entry screen invariant, and passwordless display mode invariant. No updates needed.
- `domain-brain/flows/order-production.md` already documents display mode read-only board (step 7), status columns (step 6), and the invariant that display mode must not expose mutation controls. No updates needed.
- `domain-brain/invariants.md` already includes the UI mode and display security invariants (lines 24–27). No updates needed.

### Flow-index consistency
- `flow-index.yaml` already lists `apps/staff-client` under both `user_authentication` and `order_production` flows. No new paths or entities are introduced. No updates needed.

## Validation Review

### Summary of tester results
- 15/15 unit tests pass.
- Build succeeds (tsc + vite, 40 modules, no errors).
- All acceptance criteria verified by specific tests.
- Two `act()` warnings in the logout test are a known React Testing Library timing issue and do not affect correctness.

### Missing or incomplete validation
None. All planned test cases (7a–7m) are covered, including session restore, display error handling, and command flow preservation.

## Documentation Review

- Domain brain files are already up to date per the architecture task (task-017).
- No new domain terms, entities, or state transitions introduced.
- `flow-index.yaml` requires no updates.
- Coder notes and test report are complete and accurate.

## Blocking Issues

None.

## Non-Blocking Notes

1. **Duplicated Refresh button JSX** (`App.tsx` lines 416–435): The `Refresh` button is rendered identically for both `!isDisplay` and `isDisplay` conditions. These two conditional blocks produce the same output and could be a single unconditional `<button>`. This is a minor code smell that does not affect functionality.

## Handoff

Ready for PR creation. No blocking issues. The non-blocking duplication note can be addressed in a follow-up cleanup if desired.
