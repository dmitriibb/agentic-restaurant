# Architecture Design

## 1. Task Summary

Redesign `orders-client` and `staff-client` so both applications start from mode-based entry screens, hide their working interface until a valid session exists, remove the user-visible service footer, and present the staff production board as status columns with concise emoji-based item summaries.

## 2. Problem Statement

The current UIs expose too much too early:

- both apps render their full working layout before the user has established the correct mode or session
- the bottom service-url strip exposes internal topology without helping restaurant users
- the staff UI is organized as a list-plus-detail view instead of the status-column board the kitchen and customer-facing display actually need
- the frontend has no explicit UI session mode model even though future behavior must differ for guest, registered, interactive, and display usage

The redesign must solve both UX clarity and architectural consistency. The entry mode is no longer just a visual toggle. It becomes a first-class client session concept that influences what data can be loaded, what controls are visible, and which backend contract is used.

## 3. Affected Domain Flows

Relevant existing flows:

- `user_authentication`
- `menu_browsing`
- `order_submission`
- `order_production`

Supporting references:

- `domain-brain/flows/user-authentication.md`
- `domain-brain/flows/menu-browsing.md`
- `domain-brain/flows/order-submission.md`
- `domain-brain/flows/order-production.md`
- `domain-brain/state-machines/order-lifecycle.md`
- `domain-brain/state-machines/production-item-lifecycle.md`

## 4. Constraints

- The full orders or staff working surface must not render before a valid mode and session are established.
- The chosen mode must be kept in client memory and restored from browser session state when appropriate.
- `orders-client` continues to use existing registered-user login and guest-creation backend flows.
- `staff-client` interactive mode continues to require a registered staff account.
- `staff-client` display mode must be passwordless for the human operator, but it must still be backend-authorized.
- Orders on the staff board are placed by derived order status, not by dominant item status and not in multiple columns at once.
- Item status summaries on cards should use emoji or icon markers instead of visible status text labels.
- The design should avoid browser popup windows; the extra “window” requested by the user should be implemented as an in-app step or panel to preserve focus, browser compatibility, and testability.

## 5. Proposed Architecture

### 5.1 Design Principles

Use the same interaction model in both apps:

- a focused entry shell appears first
- the operator chooses a mode
- the app completes the session flow for that mode
- only then does the main interface mount

The main runtime shell exposes only user-facing controls. Internal service addresses are removed from the visible UI. If developers still need diagnostics later, they belong behind a non-default debug affordance, not in the production-facing layout.

### 5.2 Orders Client Entry and Main Shell

`orders-client` should adopt a four-step UI state machine:

1. `landing`
2. `registered_credentials`
3. `guest_name`
4. `main`

Behavior:

- On first load with no valid session, render only the landing screen.
- The landing screen shows two large entry actions:
  - `Login as Registered`
  - `Login as Guest`
- Choosing `Login as Registered` moves to a dedicated credential panel with username and password fields.
- Choosing `Login as Guest` moves to a dedicated guest-name panel with a single name field.
- Successful authentication transitions to `main`, which mounts the menu and basket UI.

Post-login shell:

- remove the separate authentication card from the working layout
- show a top-right mode chip:
  - `Mode: registered user`
  - `Mode: guest`
- keep logout visible near the mode chip
- keep the main layout focused on `Menu` and `Basket + Checkout`

Important implementation rule:

- `getAppToken()` should become lazy for `orders-client`
- do not acquire the application token on initial page load
- acquire it only when the guest path is selected and the user submits a guest name

### 5.3 Staff Client Entry and Main Shell

`staff-client` should adopt a parallel state machine:

1. `landing`
2. `interactive_credentials`
3. `display_loading`
4. `interactive_board`
5. `display_board`

Landing screen:

- render only two large entry actions:
  - `Interactive`
  - `Display`

Interactive mode:

- selecting `Interactive` opens a dedicated username/password panel
- successful staff login mounts the full staff workspace
- header shows `Mode: interactive`
- production commands remain enabled

Display mode:

- selecting `Display` does not ask for human credentials
- instead the app silently acquires an application token configured for the display screen
- after token acquisition the app mounts a read-only board
- header shows `Mode: display`
- no production command controls are rendered
- no order-detail panel is rendered

This keeps the human workflow passwordless without making the board anonymous.

### 5.4 Explicit UI Session Model

Introduce a frontend-owned session model instead of deriving runtime behavior ad hoc from token contents.

Recommended shape:

```ts
type UiMode = "registered" | "guest" | "interactive" | "display";

type UiSession = {
  mode: UiMode;
  authKind: "user" | "application";
  accessToken?: string;
  user?: {
    id: number;
    login: string;
    displayName?: string | null;
    clientType: string;
    roles: string[];
  };
};
```

Rules:

- keep the active `UiSession` in memory as the runtime source of truth
- persist human sessions in `sessionStorage`
- for app-token-backed modes, persist only the chosen mode and reacquire the token on reload rather than storing the application token in browser storage
- `clientType` remains a backend/auth concept
- `mode` is a frontend behavior concept and must stay explicit because `display` is not equivalent to any existing human `clientType`

### 5.5 Staff Board Layout

Replace the current list-first board with status lanes:

- `Queued`
- `In Progress`
- `Blocked`
- `Ready`

Board rules:

- each order appears in exactly one lane based on `order.Status`
- mixed item states do not split the card across lanes
- the order card stays in `In Progress` when the order status is `IN_PROGRESS` even if some items are already `READY` or still `QUEUED`

Card content in interactive mode:

- order number
- optional customer display name
- age or relevant timestamp
- concise item-status summary using emoji chips:
  - `⏳` queued
  - `🍳` in progress
  - `⚠️` blocked
  - `✅` ready

Example summary:

- `⏳ 2  🍳 1  ⚠️ 0  ✅ 3`

Display-mode cards:

- show order number and emoji summary only
- omit customer name, blocked reason, and other internal detail
- remain non-clickable

Interactive detail behavior:

- clicking an order opens the existing detailed item view in a dedicated right-hand rail on desktop
- on narrower screens the detail view can slide over or stack below, but the conceptual model stays “board plus detail”
- commands stay item-level and continue to respect the existing item lifecycle rules

Sorting:

- `Queued`, `In Progress`, and `Blocked`: oldest orders first
- `Ready`: most recently updated or readied orders first

### 5.6 Backend Contract Changes

The current summary shape is not sufficient for the requested board because it does not expose full per-order item-status counts.

Add an enriched board summary contract for `production-service`.

Interactive board summary:

- keep `GET /api/v1/production/orders`
- extend the response with `itemStatusCounts`

Display board summary:

- add a dedicated read-only endpoint such as `GET /api/v1/production/display/orders`
- authorize it for `APPLICATION` callers only
- return only fields safe for customer-facing screens

Recommended summary shape:

```json
{
  "orderId": 9100,
  "status": "IN_PROGRESS",
  "createdAt": "2026-03-16T13:00:00Z",
  "updatedAt": "2026-03-16T13:07:00Z",
  "itemStatusCounts": {
    "QUEUED": 2,
    "IN_PROGRESS": 1,
    "BLOCKED": 0,
    "READY": 3
  },
  "totalItemCount": 6,
  "userDisplayName": "Alex Customer"
}
```

Display projection removes `userDisplayName` and other internal-only fields.

Authorization rules:

- interactive board list and detail endpoints: `STAFF`, `MANAGER`, `ADMIN`
- display board summary endpoint: `APPLICATION`
- item command endpoints: `STAFF`, `MANAGER`, `ADMIN` only

This means the frontend hiding controls is not the only protection. Backend authorization remains decisive.

### 5.7 Staff Display Authentication

The display screen should not be anonymous.

Use a dedicated application token flow:

- seed a `staff-client-display` application credential in `users-service`
- `staff-client` acquires this token only when display mode is selected
- the token is used only against read-only display endpoints

This reuses the existing application-auth architecture already accepted elsewhere in the platform and keeps the “no username/password” promise for the human operator.

### 5.8 Visual and Interaction Direction

The redesign should feel intentional and mode-driven:

- entry screens are centered, spacious, and single-purpose
- working screens reduce chrome and show only relevant controls
- mode chips in the header act as a permanent context reminder
- the service footer is removed entirely
- the staff board uses strong column headers, larger card rhythm, and emoji-based summaries to stay concise at a glance

## 6. Components Affected

Frontend applications:

- `apps/orders-client`
- `apps/staff-client`

Backend/API areas:

- `apps/production-service`
- `apps/users-service` seed/config for display application authentication

Tests and docs:

- `apps/orders-client/src/App.test.tsx`
- `apps/staff-client/src/App.test.tsx`
- `domain-brain/flows/user-authentication.md`
- `domain-brain/flows/order-production.md`
- related domain-brain support docs

## 7. Data Model / Ownership

No new core business aggregates are required.

Changes are limited to:

- frontend-owned `UiSession` state in each SPA
- enriched board-summary DTOs from `production-service`
- a seeded display-application credential in `users-service`

Ownership stays unchanged:

- `users-service` owns authentication and application-token issuance
- `production-service` owns production order status and summary projections
- each SPA owns only its local UI mode/session state

## 8. Interfaces

### 8.1 Orders Client Auth Paths

No new backend endpoint is required.

Use:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/guests`
- `POST /api/v1/auth/applications/token` only when the guest path is taken

### 8.2 Staff Display Auth Path

Use:

- `POST /api/v1/auth/applications/token`

Returned application token is stored in memory and used only for:

- `GET /api/v1/production/display/orders`

### 8.3 Interactive Board Summary Contract

Extend the existing order-summary DTO to include:

- `itemStatusCounts.QUEUED`
- `itemStatusCounts.IN_PROGRESS`
- `itemStatusCounts.BLOCKED`
- `itemStatusCounts.READY`
- `updatedAt` or `readyAt` for sorting

### 8.4 Display Board Contract

Return only:

- `orderId`
- `status`
- `createdAt`
- `updatedAt` or `readyAt`
- `itemStatusCounts`
- `totalItemCount`

Do not return:

- customer display names
- item-level details
- blocked reasons
- mutation affordances

## 9. Reliability / Performance Considerations

- Lazy application-token acquisition reduces unnecessary token usage in `orders-client`.
- Display mode should use the lighter display projection so a customer-facing screen is not polling unnecessary detail.
- The board redesign does not require new persistence or message flow changes.
- The existing live-refresh mechanism can be reused; the redesign is about session gating and view shape, not transport replacement.
- Keeping item-status counts in the summary endpoint avoids N+1 detail fetches just to render lane cards.

## 10. Security / Integrity Considerations

- Removing the service footer avoids exposing internal service URLs to end users.
- The main UI should remain hidden until a valid mode/session is established.
- Staff display mode is passwordless for humans, but not anonymous to the backend.
- Read-only display endpoints and interactive mutation endpoints must be authorized differently.
- Customer-facing display mode must not expose sensitive detail fields even if the browser dev tools are opened.
- Frontend mode gating is convenience only; backend authorization remains mandatory.

## 11. Trade-offs and Alternatives

### Chosen: in-app mode steps instead of real browser windows

Why:

- avoids popup blockers and multi-window state bugs
- keeps tests and navigation simpler
- still satisfies the requested “open another window” behavior as a focused next-step panel

Rejected alternative:

- actual browser popup windows for credential entry

### Chosen: application-authenticated display mode instead of anonymous board

Why:

- keeps the human workflow credential-free
- retains backend access control
- reuses existing application-token infrastructure

Rejected alternative:

- public unauthenticated display endpoint

Reason rejected:

- would expose operational data without any authorization boundary

### Chosen: order cards stay in one derived-status lane

Why:

- matches the existing order aggregate semantics
- avoids duplication and visual confusion
- aligns with the user requirement that mixed item states do not move the order out of its derived status column

Rejected alternative:

- placing one order in multiple columns based on item distribution

Reason rejected:

- duplicates work and breaks the “one order, one place” mental model

### Chosen: remove the service footer entirely

Why:

- it does not support restaurant tasks
- it exposes internal deployment detail in the runtime UI

Rejected alternative:

- keeping the footer as a persistent diagnostics strip

Reason rejected:

- it adds clutter and no operator value

## 12. Implementation Guidance for Task Splitter and Planner

Recommended implementation order:

1. Extend backend board contracts and display-mode authorization in `production-service` and `users-service`.
2. Refactor `orders-client` into a mode-gated entry shell with explicit UI session state.
3. Add the staff-client mode-selection shell and application-backed display session handling.
4. Rebuild the staff board into status lanes with emoji summaries and an interactive detail rail.

Required implementation notes:

- treat `mode` as first-class UI state, not as a styling toggle
- delete the visible service footer from both apps rather than simply hiding it with CSS
- preserve existing registered login and guest creation backend APIs
- keep display-mode tokens out of browser storage
- add accessible labels or screen-reader text for emoji summaries so the concise visual treatment does not degrade usability
- update tests to prove the main interface is hidden before session establishment

Recommended task boundaries:

- one task for the orders-client auth gate and post-login shell
- one backend task for display-mode auth and board-summary API changes
- one staff-client task for mode entry/session handling
- one staff-client task for the board redesign and interactive/detail behavior

## 13. Required Documentation Updates

Updates completed as part of this architecture task:

- `domain-brain/flows/user-authentication.md`
- `domain-brain/flows/order-production.md`
- `domain-brain/entities/access-token.md`
- `domain-brain/invariants.md`
- `domain-brain/glossary.md`
- `domain-brain/edge-cases.md`

`flow-index.yaml` does not require a path change yet because the redesign stays inside already-mapped application areas. Implementation tasks should update it only if they introduce new concrete feature paths.

## 14. Open Questions

No blocking questions remain for decomposition.

Future product decision:

- whether the customer-facing display should later suppress `READY` orders after a timeout or acknowledgement event
