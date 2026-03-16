# Implementation Plan

## Task Summary

Refactor `staff-client` so it starts on a mode-selection landing screen instead of jumping straight to a login form. Support two explicit UI modes — **interactive** (staff login with username/password) and **display** (passwordless, application-token-authenticated, read-only) — tracked as first-class session state. Remove the visible service footer. Show a mode chip in the header after session establishment.

## Architecture Input

- `source_architecture`: `task-017-redesign-ui-entry-modes-and-production-board`
- Reference: `agent/done/task-017-redesign-ui-entry-modes-and-production-board/task-017-redesign-ui-entry-modes-and-production-board.arch.md`
- Sections: 5.3 (Staff Client Entry and Main Shell), 5.4 (Explicit UI Session Model), 5.7 (Staff Display Authentication), 5.8 (Visual Direction)

## Affected Areas

### Files to modify

- `apps/staff-client/src/features/auth/session.ts` — rewrite session model with explicit `UiMode`
- `apps/staff-client/src/features/auth/api.ts` — add `acquireAppToken` function
- `apps/staff-client/src/shared/api/config.ts` — add display-mode app credential config
- `apps/staff-client/src/App.tsx` — rewrite into state-machine-driven shell with landing/credentials/board views
- `apps/staff-client/src/styles.css` — add landing screen styles, mode chip styles, remove footer styles
- `apps/staff-client/src/App.test.tsx` — rewrite tests for new flow

### Files to create

- `apps/staff-client/src/features/auth/appToken.ts` — display-mode application token manager (in-memory only)

### Files to delete (sections only)

- Footer CSS block in `styles.css` (`.service-grid` rules)
- Footer JSX in `App.tsx`

### Domain docs (review, no changes expected)

- `domain-brain/flows/user-authentication.md` — already documents display flow
- `domain-brain/flows/order-production.md` — already documents display mode

## Steps

### Step 1: Add display-mode app credential config to `shared/api/config.ts`

**File**: `apps/staff-client/src/shared/api/config.ts`

Add default constants and exported config for the display-mode application credential, following the same pattern as `orders-client/src/shared/api/config.ts`:

```ts
const DEFAULT_DISPLAY_APP_NAME = "staff-client-display";
const DEFAULT_DISPLAY_APP_SECRET = "staff-client-display-secret";

export const displayAppAuthConfig = {
  appName: import.meta.env.VITE_DISPLAY_APP_NAME ?? DEFAULT_DISPLAY_APP_NAME,
  appSecret: import.meta.env.VITE_DISPLAY_APP_SECRET ?? DEFAULT_DISPLAY_APP_SECRET,
} as const;
```

Keep the existing `serviceBaseUrls` export unchanged.

### Step 2: Add `acquireAppToken` to `features/auth/api.ts`

**File**: `apps/staff-client/src/features/auth/api.ts`

Add a new `AppTokenResponse` type and an `acquireAppToken` function that calls `POST /api/v1/auth/applications/token`. Follow the same signature/pattern as `orders-client/src/features/auth/api.ts`:

```ts
export type AppTokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserSummary;
};

export async function acquireAppToken(
  name: string,
  secret: string
): Promise<AppTokenResponse> {
  const response = await fetch(
    `${serviceBaseUrls.usersService}/api/v1/auth/applications/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationName: name, applicationSecret: secret }),
    }
  );

  if (!response.ok) {
    throw new Error("Application token acquisition failed.");
  }

  return (await response.json()) as AppTokenResponse;
}
```

Keep existing `login`, `LoginResponse`, and `UserSummary` exports unchanged.

### Step 3: Create `features/auth/appToken.ts` — in-memory display token manager

**File**: `apps/staff-client/src/features/auth/appToken.ts` (new file)

Create a module that manages the display-mode application token entirely in memory. Follow the pattern of `orders-client/src/features/auth/appToken.ts` but scoped to display use:

Module-level state (not exported):
- `let displayToken = ""`
- `let displayTokenExpiresAt = 0`
- `let inFlightRequest: Promise<string> | null = null`
- `let refreshTimer: ReturnType<typeof setTimeout> | null = null`

Constants:
- `REFRESH_FACTOR = 0.8`
- `MAX_RETRIES = 5`
- `INITIAL_RETRY_DELAY_MS = 1000`
- `MAX_RETRY_DELAY_MS = 30000`
- `TOKEN_EXPIRY_BUFFER_MS = 1000`

Internal functions:
- `hasValidToken(): boolean` — checks `displayToken` is set and not expiring soon
- `clearRefreshTimer(): void`
- `scheduleRefresh(expiresInSeconds: number): void`
- `delay(ms: number): Promise<void>`
- `requestTokenWithRetry(): Promise<string>` — calls `acquireAppToken(displayAppAuthConfig.appName, displayAppAuthConfig.appSecret)` with retry loop
- `refreshToken(): Promise<void>` — background refresh
- `forceTokenRefresh(): Promise<string>` — deduplicates concurrent requests

Exported functions:
- `getDisplayToken(): Promise<string>` — returns cached token or acquires a new one
- `clearDisplayToken(): void` — clears module state and cancels refresh timer (used on logout/mode-change)

Import `acquireAppToken` from `./api` and `displayAppAuthConfig` from `../../shared/api/config`.

Critical rule: **no `sessionStorage` or `localStorage` usage**. Token lives only in module-scope variables.

### Step 4: Rewrite `features/auth/session.ts` — explicit `UiSession` model

**File**: `apps/staff-client/src/features/auth/session.ts`

Replace the existing `SessionAuth` type with a richer `UiSession` model per architecture section 5.4:

```ts
import type { UserSummary } from "./api";

export type UiMode = "interactive" | "display";

export type UiSession = {
  mode: UiMode;
  authKind: "user" | "application";
  accessToken: string;
  user?: UserSummary;
};
```

Storage rules:
- Interactive mode: persist `{ mode, user }` to `sessionStorage` (same key `staff-client-auth`), but the `accessToken` field must be stored too so we can restore the session on refresh.
- Display mode: persist only `{ mode: "display" }` to `sessionStorage`. **Do not store the application token**. On reload, the app detects `mode: "display"` and reacquires the token.

Rewrite the read/write helpers:

```ts
export const AUTH_STORAGE_KEY = "staff-client-auth";

type PersistedInteractiveSession = {
  mode: "interactive";
  token: string;
  user: UserSummary;
};

type PersistedDisplaySession = {
  mode: "display";
};

type PersistedSession = PersistedInteractiveSession | PersistedDisplaySession;

export function readPersistedSession(): PersistedSession | null {
  const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    if (parsed.mode === "interactive") {
      if (!parsed.token || !parsed.user?.id || !parsed.user?.login) return null;
      return parsed;
    }
    if (parsed.mode === "display") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeInteractiveSession(token: string, user: UserSummary): void {
  const data: PersistedInteractiveSession = { mode: "interactive", token, user };
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

export function writeDisplaySession(): void {
  const data: PersistedDisplaySession = { mode: "display" };
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

export function clearSession(): void {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}
```

### Step 5: Rewrite `App.tsx` — state-machine-driven shell

**File**: `apps/staff-client/src/App.tsx`

Replace the current two-state (login form / board) architecture with a five-state machine per architecture section 5.3:

```ts
type AppView =
  | "landing"
  | "interactive_credentials"
  | "display_loading"
  | "interactive_board"
  | "display_board";
```

#### 5a: State initialization

On mount, check `readPersistedSession()`:
- If `null` → `view = "landing"`
- If `mode === "interactive"` and valid token/user → build `UiSession` from persisted data, set `view = "interactive_board"`
- If `mode === "display"` → set `view = "display_loading"`, trigger token acquisition, then transition to `"display_board"` on success

State variables to add:
- `const [view, setView] = useState<AppView>(initialView)` — computed from persisted session
- `const [session, setSession] = useState<UiSession | null>(initialSession)` — null until established
- `const [displayError, setDisplayError] = useState<string | null>(null)` — display-mode token acquisition error

Remove old state variables: `token`, `user`. Derive them from `session` instead.

Keep existing state: `loginValue`, `password`, `authError`, `authLoading`, `orders`, `boardLoading`, `boardError`, `selectedOrderId`, `orderDetail`, `detailLoading`, `detailError`, `commandLoading`, `commandError`.

#### 5b: Landing screen

When `view === "landing"`, render a centered landing screen with two large buttons:

```tsx
<section className="landing-screen" aria-label="mode selection" data-testid="mode-selection">
  <h2>Staff Client</h2>
  <p>Select a mode to continue</p>
  <div className="landing-actions">
    <button
      className="action landing-btn"
      type="button"
      onClick={() => setView("interactive_credentials")}
      data-testid="mode-interactive"
    >
      Interactive
    </button>
    <button
      className="action landing-btn"
      type="button"
      onClick={() => void enterDisplayMode()}
      data-testid="mode-display"
    >
      Display
    </button>
  </div>
</section>
```

#### 5c: Interactive credentials screen

When `view === "interactive_credentials"`, render the existing login form (username/password) plus a "Back" button to return to landing:

```tsx
<section className="surface-card auth-section" aria-label="authentication">
  <h2>Staff Sign In</h2>
  <form className="auth-form" onSubmit={onLogin}>
    {/* existing Login + Password labels/inputs */}
    <div className="auth-form-actions">
      <button className="action ghost" type="button" onClick={goBackToLanding}>Back</button>
      <button className="action" type="submit" disabled={authLoading}>
        {authLoading ? "Signing in..." : "Sign In"}
      </button>
    </div>
  </form>
  {authError && <p className="error-text">{authError}</p>}
</section>
```

`onLogin` handler changes:
- On success, create `UiSession { mode: "interactive", authKind: "user", accessToken, user }`.
- Call `writeInteractiveSession(response.accessToken, response.user)`.
- Set `session` state and `view = "interactive_board"`.

`goBackToLanding` handler:
- Reset `loginValue`, `password`, `authError`.
- Set `view = "landing"`.

#### 5d: Display loading screen

When `view === "display_loading"`, show a loading indicator:

```tsx
<section className="landing-screen" aria-label="display loading" data-testid="display-loading">
  <p>Connecting display mode...</p>
  {displayError && (
    <>
      <p className="error-text">{displayError}</p>
      <button className="action" type="button" onClick={goBackToLanding}>Back</button>
    </>
  )}
</section>
```

`enterDisplayMode` async function:
1. Set `view = "display_loading"`, clear `displayError`.
2. Call `getDisplayToken()` from the appToken module.
3. On success: create `UiSession { mode: "display", authKind: "application", accessToken: token }`, call `writeDisplaySession()`, set `session` state, set `view = "display_board"`.
4. On failure: set `displayError` with the error message. Keep `view = "display_loading"` so the error and Back button are visible.

#### 5e: Interactive board view

When `view === "interactive_board"`, render the header (with mode chip) and the existing board layout with order list + detail panel. This is essentially the current authenticated view, sourced from `session.accessToken`.

The existing board rendering code stays mostly the same, but all references to `token` change to `session!.accessToken`, and `user` becomes `session!.user`.

#### 5f: Display board view

When `view === "display_board"`, render the header (with mode chip) and the board in read-only mode:
- Use the same `fetchOrders` call with `session!.accessToken` (existing interactive endpoint is fine for now; the dedicated display endpoint is a future backend concern from task-019).
- Order cards are rendered but are **not clickable** (use `<div>` instead of `<button>`).
- **No detail panel** is rendered.
- **No item command buttons** are rendered.
- Order cards show only: order number, status badge, item summary line, timestamp.

#### 5g: Header with mode chip

After session is established (both `interactive_board` and `display_board`), render a mode chip in the header:

```tsx
<span className="mode-chip" data-testid="mode-chip">
  Mode: {session.mode}
</span>
```

In interactive mode, also show the existing auth-info and logout button.
In display mode, show only a "Back" or "Exit" button (which clears display token and returns to landing).

#### 5h: Logout / Exit behavior

Interactive logout:
- Call `clearDisplayToken()` (no-op but safe).
- Call `clearSession()`.
- Reset all state. Set `view = "landing"`.

Display exit:
- Call `clearDisplayToken()`.
- Call `clearSession()`.
- Reset all state. Set `view = "landing"`.

#### 5i: Auto-reload on display session restore

The `useEffect` that polls the board must handle both modes:
- For interactive: use `session.accessToken` (already stored in session state).
- For display: use `session.accessToken` (acquired fresh in the loading step or on reload).

On page reload with a persisted display session:
- The initial state computation detects `mode: "display"` from `readPersistedSession()`.
- Sets `view = "display_loading"` and triggers `enterDisplayMode()` via a `useEffect`.
- After token acquisition completes, transitions to `"display_board"`.

#### 5j: Remove the footer

Delete the entire `<footer>` element from `App.tsx`. The `serviceBaseUrls` import may still be needed in `api.ts` files but should no longer be imported in `App.tsx` if it was only used for the footer display.

Currently `App.tsx` imports `serviceBaseUrls` from `./shared/api/config` — this import should be removed since it is only used in the footer JSX.

### Step 6: Update `styles.css`

**File**: `apps/staff-client/src/styles.css`

#### 6a: Remove footer styles

Delete the entire `.service-grid` block (lines 315–335 approx), including the responsive override in the `@media (max-width: 700px)` block.

#### 6b: Add landing screen styles

```css
/* ── Landing screen ── */

.landing-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1rem;
  min-height: 50vh;
}

.landing-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.landing-btn {
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  border-radius: 16px;
}
```

#### 6c: Add mode chip styles

```css
/* ── Mode chip ── */

.mode-chip {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: capitalize;
  background: #dbe9f8;
  color: #1a5fa0;
  letter-spacing: 0.03em;
}
```

#### 6d: Add auth form actions row style

```css
.auth-form-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
```

### Step 7: Rewrite `App.test.tsx`

**File**: `apps/staff-client/src/App.test.tsx`

Replace the existing test suite with tests that validate the new state machine. Tests should:

#### 7a: Landing screen test
- Render `<App />` with no persisted session.
- Assert the landing screen is visible (`data-testid="mode-selection"`).
- Assert "Interactive" and "Display" buttons are present.
- Assert that no order list, login form, or board is rendered.

#### 7b: Interactive credentials test
- Click "Interactive" on the landing screen.
- Assert the login form (username/password fields, "Sign In" button) appears.
- Assert a "Back" button is present.

#### 7c: Interactive login and board test
- Click "Interactive", fill credentials, submit.
- Mock `fetch` for login → success, then board load → orders.
- Assert `data-testid="mode-chip"` shows `Mode: interactive`.
- Assert `data-testid="auth-status"` shows user name.
- Assert order list is rendered.

#### 7d: Display mode token acquisition test
- Click "Display" on the landing screen.
- Mock `fetch` for app token → success, then board load → orders.
- Assert `data-testid="display-loading"` appears briefly.
- Assert `data-testid="mode-chip"` shows `Mode: display`.
- Assert order cards are rendered but are **not clickable buttons**.
- Assert no detail panel is visible.
- Assert the app token fetch was called with `staff-client-display` credentials.

#### 7e: Display mode error test
- Click "Display", mock `fetch` to reject.
- Assert error message is displayed.
- Assert "Back" button returns to landing.

#### 7f: Interactive session restore from storage test
- Pre-populate `sessionStorage` with `{ mode: "interactive", token: "...", user: {...} }`.
- Render `<App />`.
- Assert board is visible immediately (no landing, no login).
- Assert mode chip shows `Mode: interactive`.

#### 7g: Display session restore from storage test
- Pre-populate `sessionStorage` with `{ mode: "display" }`.
- Mock `fetch` for app token → success, then board → orders.
- Render `<App />`.
- Assert display loading appears, then display board.
- Assert mode chip shows `Mode: display`.

#### 7h: Interactive logout test
- Start with a restored interactive session.
- Click "Logout".
- Assert landing screen is shown.
- Assert `sessionStorage` is cleared.

#### 7i: Display exit test
- Establish a display session.
- Click "Exit" (or the exit button).
- Assert landing screen is shown.

#### 7j: Footer removed test
- Render `<App />` in any state.
- Assert `data-testid="service-config"` is **not** in the document.

#### 7k: Back button from credentials test
- Click "Interactive" to go to credentials.
- Click "Back".
- Assert landing screen is shown again.

#### 7l: Display mode read-only test
- Establish display session with orders.
- Assert order cards exist but no production command buttons (pickup, block, resume, ready) are rendered.
- Assert clicking an order card does not open detail.

#### 7m: Preserve existing command tests
- Keep the pickup and ready command tests but adapt them to start from a restored interactive session (with the new `{ mode: "interactive", token, user }` storage format).

### Step 8: Verify build and tests pass

Run:
- `npm test` in `apps/staff-client`
- `npm run build` in `apps/staff-client`

Fix any TypeScript or test errors.

## Tests

| Test | Validates |
|------|-----------|
| Landing screen renders mode selection | Main UI hidden before session |
| Interactive button shows credentials | Mode-selection → credentials transition |
| Back button returns to landing | Credentials → landing transition |
| Interactive login shows board with mode chip | Full interactive flow |
| Display mode acquires token and shows board | Display flow, no credentials asked |
| Display mode error shows message + back | Error handling for token failure |
| Interactive session restore | Persisted interactive session reload |
| Display session restore re-acquires token | Persisted display mode triggers token reacquire |
| Interactive logout returns to landing | Logout clears state |
| Display exit returns to landing | Exit clears display token |
| Footer not rendered | Service footer removed |
| Display mode is read-only | No commands, no detail, no clickable cards |
| Pickup command flow (interactive) | Existing command behavior preserved |
| Ready command flow (interactive) | Existing command behavior preserved |

## Domain Documentation Updates

- `domain-brain/flows/user-authentication.md` — **no changes needed**. Already documents the staff display flow (steps in "Staff Display Flow" section) and the mode-based entry screen invariant.
- `domain-brain/flows/order-production.md` — **no changes needed**. Already documents display mode read-only board and interactive columns.
- `flow-index.yaml` — **no changes needed**. The `user_authentication` and `order_production` flows already list `apps/staff-client` in their paths. No new paths or entities are introduced.

## Open Questions

- The display board currently uses the same `GET /api/v1/production/orders` endpoint as interactive mode. The dedicated `GET /api/v1/production/display/orders` endpoint is expected from `task-019`. If that endpoint is not yet available at implementation time, use the existing interactive endpoint with the display token temporarily. The coder should check whether the display endpoint exists and use it if available, otherwise fall back to the interactive endpoint.
- The `staff-client-display` application credential must be seeded in `users-service`. This is expected from `task-019` (dependency). If the seed is not yet present, the display mode will fail token acquisition, which is an acceptable degraded state with a clear error message.
