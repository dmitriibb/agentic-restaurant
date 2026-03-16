# Coder Notes — task-020-add-staff-client-mode-selection-and-display-session

## Summary

Implemented all 8 plan steps: added display-mode app credential config, acquireAppToken API function, in-memory display token manager, explicit UiSession model with new persistence helpers, a 5-state machine App shell (landing → interactive_credentials → display_loading → interactive_board → display_board), CSS for landing/mode-chip/auth-form-actions, removed the footer entirely, and rewrote the test suite with 15 passing tests covering the full state machine.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `apps/staff-client/src/shared/api/config.ts` | Modified | Added `displayAppAuthConfig` with `VITE_DISPLAY_APP_NAME` / `VITE_DISPLAY_APP_SECRET` defaults |
| `apps/staff-client/src/features/auth/api.ts` | Modified | Added `AppTokenResponse` type and `acquireAppToken` function |
| `apps/staff-client/src/features/auth/appToken.ts` | **Created** | In-memory display token manager with retry, refresh scheduling, deduplication. No browser storage. |
| `apps/staff-client/src/features/auth/session.ts` | Rewritten | Replaced `SessionAuth` with `UiSession` / `UiMode`. New `readPersistedSession`, `writeInteractiveSession`, `writeDisplaySession`, `clearSession` helpers. Display sessions persist only `{ mode: "display" }` (no token). |
| `apps/staff-client/src/App.tsx` | Rewritten | 5-state machine: `landing`, `interactive_credentials`, `display_loading`, `interactive_board`, `display_board`. Footer removed. Mode chip in header. Display board is read-only (div cards, no detail panel, no commands). Interactive board preserves all existing functionality. |
| `apps/staff-client/src/styles.css` | Modified | Removed `.service-grid` footer styles (including responsive overrides). Added `.landing-screen`, `.landing-actions`, `.landing-btn`, `.mode-chip`, `.auth-form-actions` styles. |
| `apps/staff-client/src/App.test.tsx` | Rewritten | 15 tests covering: landing screen, interactive credentials, interactive login + board, display token acquisition, display error, interactive session restore, display session restore, interactive logout, display exit, footer removed (2 tests), back button from credentials, display read-only, pickup command, ready command. |

## Key Design Decisions

1. **Display token never stored in browser storage**: `appToken.ts` uses only module-scope variables. On page reload with a persisted `{ mode: "display" }` session, the app enters `display_loading` and calls `getDisplayToken()` to reacquire.

2. **State machine drives rendering**: The `AppView` discriminated union controls which screen renders. No boolean flags. `computeInitialState()` reads persisted session once on mount.

3. **Display board is read-only**: Order cards render as `<div>` instead of `<button>`. No detail panel. No item command buttons. The same `fetchOrders` endpoint is reused since the dedicated display endpoint from task-019 may not be available yet.

4. **appToken module mocked in tests**: Tests use `vi.mock("./features/auth/appToken")` to control display token acquisition without hitting real endpoints or dealing with retry timers.

5. **Backward-compatible session format**: The new persisted format adds `mode` field. Old sessions without `mode` return `null` from `readPersistedSession()`, which correctly sends users to the landing screen.

## Verification

- `npm test` → 15 tests pass (1 test file)
- `npm run build` → TypeScript compilation and Vite build succeed
- No lint or type errors

## Risks

- The display endpoint (`GET /api/v1/production/display/orders`) from task-019 is not yet used. The interactive orders endpoint is used as a fallback. When the display endpoint lands, it should be easy to add a conditional in `loadBoard`.
- The `staff-client-display` app credential must be seeded in users-service (task-019 dependency). Without it, display mode will show the error screen with "Application token acquisition failed." — acceptable degraded behavior.
