# Implementation Plan

## Task Summary
Improve the `orders-client` UI by removing the "Navigation" header in the sidebar, replacing the "Reload Menu" text button with an icon button, and adding a dynamically generated QR code (using `qrcode.react` or similar dynamically downloaded library) to the landing screen to allow local network access.

## Architecture Input
- none

## Affected Areas
- `apps/orders-client/package.json`
- `apps/orders-client/src/App.tsx` (or other relevant UI/layout components)
- `apps/orders-client/src/` (helper function for IP detection)

## Steps
1. Install QR code library dynamically in the `apps/orders-client` workspace (e.g., `npm install qrcode.react`).
2. Update the sidebar navigation component in the UI to remove the "Navigation" header text.
3. Update the top action bar to replace the "Reload Menu" text with a clean refresh icon (SVG or standard `↻`).
4. Implement a utility to detect or allow input of the local LAN IP (handling `localhost` fallback).
5. Integrate the QR Code component into the landing/login selection screen using the detected LAN IP.
6. Verify UI styling aligns with `docs/ui-design-rules.md`.

## Tests
- Run `npm run dev` in `apps/orders-client` to verify the application starts successfully and components render.
- Visually verify the sidebar has no "Navigation" text.
- Visually verify the top bar has an icon for reload.
- Verify the QR code is generated and points to a valid local IP rather than just `localhost`.

## Domain Documentation Updates
- None required (UI styling and client-side access features do not alter core business logic or invariants).

## Open Questions
- If the app is strictly hosted on `localhost` without `--host` in Vite, how will other devices reach it? The coder should ensure the dev server binds to `0.0.0.0` or provide instructions to do so.