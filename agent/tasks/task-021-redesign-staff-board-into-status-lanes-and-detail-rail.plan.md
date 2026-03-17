# Implementation Plan

## Task Summary

Redesign the `staff-client` production board from a vertically-stacked status-section list into four side-by-side status-lane columns (Queued, In Progress, Blocked, Ready). Replace text-based item counts with concise emoji summaries (`⏳`, `🍳`, `⚠️`, `✅`). Add a separate `fetchDisplayOrders` API call for display mode that hits the display endpoint. Keep the interactive detail rail on the right. Make display mode fully non-interactive (no selection, no commands).

## Architecture Input

- `source_architecture`: `task-017-redesign-ui-entry-modes-and-production-board`
- Reference: `agent/done/task-017-redesign-ui-entry-modes-and-production-board/task-017-redesign-ui-entry-modes-and-production-board.arch.md`
- Key sections: 5.5 Staff Board Layout, 5.6 Backend Contract Changes, 8.3–8.4 Board Contracts

## Affected Areas

### Files to modify

- `apps/staff-client/src/features/production/types.ts` — update `ProductionOrder` type to include `ItemStatusCounts`; add `DisplayOrder` type
- `apps/staff-client/src/features/production/api.ts` — add `fetchDisplayOrders` function targeting `/api/v1/production/display/orders`
- `apps/staff-client/src/App.tsx` — rewrite board rendering into four lane columns, emoji summaries, separate display/interactive render paths, use display API for display mode
- `apps/staff-client/src/styles.css` — add lane-based board layout CSS (four-column grid), emoji-chip styles
- `apps/staff-client/src/App.test.tsx` — update existing tests and add new tests for emoji summaries, lane layout, mixed-status card, interactive detail flow

### Files NOT changed (out of scope)

- Backend `production-service` — already has both interactive and display endpoints with `ItemStatusCounts`
- Auth, session, appToken modules — already correct from task-019/task-020

## Steps

### Step 1: Update `ProductionOrder` type to match backend response

File: `apps/staff-client/src/features/production/types.ts`

- Add an `ItemStatusCounts` type:
  ```ts
  export type ItemStatusCounts = {
    Queued: number;
    InProgress: number;
    Blocked: number;
    Ready: number;
  };
  ```
- Update `ProductionOrder` to replace `ReadyItemCount` and `BlockedItemCount` with `ItemStatusCounts` and keep `TotalItemCount`:
  ```ts
  export type ProductionOrder = {
    OrderID: number;
    ExternalRequestID: string;
    UserID: number;
    UserDisplayName: string | null;
    Status: string;
    TotalItemCount: number;
    ItemStatusCounts: ItemStatusCounts;
    CreatedAt: string;
    UpdatedAt: string;
    ReadyAt: string | null;
    Version: number;
  };
  ```
- Add a `DisplayOrder` type (no `UserDisplayName`, no `ExternalRequestID`, no `UserID`, no `ReadyAt`, no `Version`):
  ```ts
  export type DisplayOrder = {
    OrderID: number;
    Status: string;
    TotalItemCount: number;
    ItemStatusCounts: ItemStatusCounts;
    CreatedAt: string;
    UpdatedAt: string;
  };
  ```

### Step 2: Add `fetchDisplayOrders` API function

File: `apps/staff-client/src/features/production/api.ts`

- Add `fetchDisplayOrders(token: string): Promise<DisplayOrder[]>` that calls `GET /api/v1/production/display/orders?limit=200` with the application token.
- The existing `fetchOrders` continues to hit the interactive endpoint.

### Step 3: Refactor `App.tsx` — board state to use union type for orders

File: `apps/staff-client/src/App.tsx`

- Import the new types (`DisplayOrder`, `ItemStatusCounts`) and `fetchDisplayOrders`.
- Change the `orders` state to hold `ProductionOrder[]` for interactive mode and `DisplayOrder[]` for display mode. Since both have overlapping fields, use a union or keep them separate:
  - Add `displayOrders` state: `useState<DisplayOrder[]>([])`
  - Keep `orders` for interactive mode
  - In `loadBoard`, branch by session mode:
    - `interactive`: call `fetchOrders(token)` and set `orders`
    - `display`: call `fetchDisplayOrders(token)` and set `displayOrders`

### Step 4: Create emoji summary helper function

File: `apps/staff-client/src/App.tsx`

- Add a function `renderEmojiSummary(counts: ItemStatusCounts): JSX.Element` that produces accessible emoji chips:
  ```
  ⏳ 2  🍳 1  ⚠️ 0  ✅ 3
  ```
- Each emoji chip should be a `<span>` with an `aria-label` for screen readers, e.g. `aria-label="2 queued"`.
- Wrap the full summary in a container with `role="group"` and `aria-label="item status summary"`.
- Zero-count statuses can still be shown (architecture does not suppress them), keeping the summary shape consistent.

### Step 5: Rewrite interactive board as four lane columns

File: `apps/staff-client/src/App.tsx`

- Replace the current single-panel `order-list-panel` with a four-column `board-lanes` container.
- Each lane has a column header (e.g. "Queued", "In Progress", "Blocked", "Ready") and renders orders filtered by `order.Status`.
- Each order card in interactive mode is a `<button>` (clickable for detail loading) and contains:
  - Order number (`Order #ID`)
  - Customer display name (or `User #ID` fallback)
  - Emoji item-status summary (from Step 4)
  - Timestamp (formatted `CreatedAt`)
- Remove the old text-based `Items: X/Y ready | Z blocked` format.
- Remove the inline `status-badge` on each order card header (the lane itself conveys the status).
- Sorting within lanes:
  - Queued, In Progress, Blocked: oldest first (ascending `CreatedAt`)
  - Ready: most recently updated first (descending `UpdatedAt`)
- The detail rail stays on the right. The four lanes + detail rail use a grid layout: `1fr 1fr 1fr 1fr` for lanes, plus a wider detail column for the rail.

### Step 6: Rewrite display board as four lane columns (read-only)

File: `apps/staff-client/src/App.tsx`

- Display mode uses the same four-lane structure but:
  - Order cards are `<div>` elements (non-clickable)
  - Cards show only: order number + emoji summary + time
  - No customer name, no blocked reason, no other internal detail
  - No detail rail at all (already the case, maintain it)
- Use `displayOrders` state.

### Step 7: Update CSS for lane-based board layout

File: `apps/staff-client/src/styles.css`

- Add `.board-lanes` class: a CSS grid with `grid-template-columns: repeat(4, 1fr)` and gap.
- Add `.board-lanes-with-detail` class: `grid-template-columns: repeat(4, 1fr) minmax(300px, 1.2fr)` for interactive mode with the detail rail as a fifth column.
- Add `.lane` class: vertical column container with header, gap between cards, and scroll.
- Add `.lane-header` class: styled column header matching status color.
- Add `.emoji-summary` class: flex row for emoji chips with small gap.
- Add `.emoji-chip` class: inline style for each emoji + count pair.
- Update responsive breakpoints:
  - Below 1200px: lanes collapse to 2x2 grid with detail below.
  - Below 900px: lanes stack vertically, detail below.
- Remove or keep `.status-section` class (it may still be used for fallback, but if fully replaced, remove it to avoid dead CSS).

### Step 8: Update `loadBoard` to use correct endpoint per mode

File: `apps/staff-client/src/App.tsx`

- In the `loadBoard` function:
  - If `session.mode === "display"`, call `fetchDisplayOrders(token)` and set `displayOrders`.
  - If `session.mode === "interactive"`, call `fetchOrders(token)` and set `orders`.
- Update the polling `useEffect` to use the same branching.
- Ensure `resetAllState` clears both `orders` and `displayOrders`.

### Step 9: Update existing tests for new board structure

File: `apps/staff-client/src/App.test.tsx`

- Update `SAMPLE_ORDER` to match the new `ProductionOrder` shape:
  - Remove `ReadyItemCount`, `BlockedItemCount`
  - Add `ItemStatusCounts: { Queued: 2, InProgress: 0, Blocked: 0, Ready: 0 }`
- Update display-mode test responses to match `DisplayOrder` shape (no `UserDisplayName`, no `ExternalRequestID`, etc.).
- Update the display-mode test mock to intercept `/api/v1/production/display/orders` instead of `/api/v1/production/orders`.
- Update all assertions that check for the old `Items: X/Y ready` text — replace with assertions for emoji summary content.
- Ensure that test for `order-9100` still works (the testid pattern remains `order-{OrderID}`).

### Step 10: Add test — mixed-status emoji summary rendering

File: `apps/staff-client/src/App.test.tsx`

- Add a test that renders an order with mixed item statuses, e.g. `ItemStatusCounts: { Queued: 2, InProgress: 1, Blocked: 0, Ready: 3 }` and order Status `IN_PROGRESS`.
- Assert the order card appears in the In Progress lane (not duplicated in other lanes).
- Assert the emoji summary shows the correct counts with accessible labels.

### Step 11: Add test — interactive detail flow with new board layout

File: `apps/staff-client/src/App.test.tsx`

- Add or update a test that:
  1. Renders the interactive board with lane layout
  2. Clicks an order card in one of the lanes
  3. Verifies the detail rail opens with order detail
  4. Verifies item commands are available in the detail rail
- This validates the new lane layout doesn't break the existing detail/command flow.

### Step 12: Add test — display mode uses display endpoint

File: `apps/staff-client/src/App.test.tsx`

- Verify that in display mode, the fetch call goes to `/api/v1/production/display/orders`, not `/api/v1/production/orders`.
- Verify display cards show only order number, emoji summary, and time — no customer name.

### Step 13: Remove dead code and unused types

File: `apps/staff-client/src/App.tsx` and `types.ts`

- Remove `statusBadgeClass` function if no longer used on board cards (it may still be used in the detail rail for item statuses — check before removing).
- Remove unused CSS classes from `styles.css` if they're no longer referenced.
- Remove the `ordersByStatus` helper if replaced by inline filtering per lane.

### Step 14: Run validation

- Run `npm test` in `apps/staff-client` — all tests must pass.
- Run `npm run build` in `apps/staff-client` — build must succeed.

## Tests

1. **Mixed-status summary case** (acceptance criteria): An order with `ItemStatusCounts: { Queued: 2, InProgress: 1, Blocked: 0, Ready: 3 }` and `Status: "IN_PROGRESS"` appears in only the In Progress lane. The emoji summary shows `⏳ 2 🍳 1 ⚠️ 0 ✅ 3`.

2. **Interactive detail flow** (acceptance criteria): Click an order in a lane → detail rail shows order info and item commands → execute a command → board and detail refresh.

3. **Display mode uses display endpoint**: Verify fetch URL is `/api/v1/production/display/orders`.

4. **Display mode read-only**: No clickable cards, no detail rail, no command buttons.

5. **Lane placement by order.Status**: Orders with Status `QUEUED` appear only in the Queued lane, `IN_PROGRESS` in In Progress lane, etc.

6. **Accessible emoji summaries**: Emoji chips have `aria-label` attributes with counts.

7. **Update existing tests** (7c, 7d, 7l, 7m): Adapt to the new `ItemStatusCounts` response shape and lane-based layout assertions.

## Domain Documentation Updates

No domain-brain or flow-index.yaml updates are required for this task. The domain documentation was already updated during task-017 architecture to describe the status-lane board model, emoji summaries, and display-mode read-only behavior. The changes here are purely frontend implementation matching the existing documented architecture.

## Open Questions

None. The backend contracts (interactive and display endpoints with `ItemStatusCounts`) are already implemented and tested. The frontend work is self-contained within `apps/staff-client`.
