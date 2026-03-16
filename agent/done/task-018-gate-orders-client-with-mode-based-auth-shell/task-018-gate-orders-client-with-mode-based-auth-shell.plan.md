# Implementation Plan

## Task Summary
- Refactor orders-client to a mode-gated auth shell where unauthenticated users only see entry/login steps, and menu/basket UI appears only after successful auth.
- Persist explicit UI mode metadata (`registered` or `guest`) with the auth session.
- Remove the runtime service footer and make guest app-token acquisition lazy.

## Architecture Input
- `source_architecture`: `task-017-redesign-ui-entry-modes-and-production-board`
- Reference: `agent/done/task-017-redesign-ui-entry-modes-and-production-board/task-017-redesign-ui-entry-modes-and-production-board.arch.md`

## Affected Areas
- `apps/orders-client/src/App.tsx`
- `apps/orders-client/src/styles.css`
- `apps/orders-client/src/features/auth/session.ts`
- `apps/orders-client/src/App.test.tsx`
- `domain-brain/flows/user-authentication.md`

## Steps
1. Extend orders-client auth session typing/storage to include `mode` metadata and keep compatibility with restored sessions.
2. Replace the current always-rendered three-panel shell with entry-state flow (`landing`, `registered_credentials`, `guest_name`, `main`) and render menu/basket only in `main`.
3. Keep registered and guest authentication paths functionally intact while making guest app-token acquisition lazy (only on guest submit).
4. Add authenticated header mode chip (`Mode: registered user` or `Mode: guest`) and simplify runtime layout to menu + basket controls; remove visible service footer.
5. Update orders-client tests to validate entry gating, mode rendering, lazy guest app-token use, and restored session behavior.
6. Update domain flow documentation to reflect the implemented orders-client mode-gated auth/session behavior.

## Tests
- `npm test` in `apps/orders-client`
- `npm run build` in `apps/orders-client`

## Domain Documentation Updates
- Update `domain-brain/flows/user-authentication.md` with implemented orders-client mode-gated shell and lazy guest app-token acquisition wording.
- `flow-index.yaml`: no mapping change expected (same flow ownership and paths).

## Open Questions
- none
