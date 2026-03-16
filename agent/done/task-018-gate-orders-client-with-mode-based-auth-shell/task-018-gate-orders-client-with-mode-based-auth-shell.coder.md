# Coder Report

## Implemented Changes
- Refactored `apps/orders-client/src/App.tsx` to a mode-gated auth state flow (`landing`, `registered_credentials`, `guest_name`, `main`) so menu/basket render only after authentication.
- Added explicit UI mode handling (`registered`/`guest`) in runtime state and persisted session payload.
- Removed the runtime service footer from the orders-client UI and added authenticated header mode chip display.
- Kept registered and guest API paths intact while ensuring guest application token acquisition happens only on guest submit.
- Updated `apps/orders-client/src/styles.css` to support the new entry shell and authenticated two-panel layout.

## Tests Added or Updated
- Reworked `apps/orders-client/src/App.test.tsx` coverage for mode-gated entry behavior, registered flow, guest flow, lazy app-token acquisition, and restored mode-aware session behavior.

## Domain Documentation Updates
- Updated `domain-brain/flows/user-authentication.md` guest-flow wording to explicitly capture lazy app-token acquisition in orders-client.
- `flow-index.yaml` unchanged (no path/ownership changes).

## Assumptions
- Existing stored sessions without explicit `mode` should continue to restore by inferring mode from `clientType` (fallback to `registered`).

## Known Limitations
- none
