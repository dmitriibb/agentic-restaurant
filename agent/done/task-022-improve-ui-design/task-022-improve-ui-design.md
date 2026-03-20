# Task 022: Improve UI Design in Orders-Client App

```yaml
id: task-022-improve-ui-design
title: Improve UI design elements in orders-client App.tsx
pipeline: implementation
status: done
priority: medium
type: feature
architecture: not_requested
source_architecture: ""
retry_count: 0
created_at: 2026-03-20
requested_by: human
areas:
  - apps/orders-client
flows: []
dependencies: []
validation:
  - npm run dev
```

## Summary

This task updates the `orders-client` landing and main app UI based on finalized Penpot wireframes. Changes involve modifying sidebar labels, replacing text buttons with icon buttons, and integrating a QR code that encodes the local network IP so devices on the same Wi-Fi can easily access the local server.

## Requirements

- Remove the "Navigation" header text inside the sidebar menu.
- Replace the current "Reload Menu" text button in the top action bar with a circular icon button containing a refresh symbol (such as `↻` or a clean SVG icon).
- Add a dynamically generated QR Code to the first "landing" screen where the users select "Guest" or "Registered User" login. 
- The QR code must use a QR code library (e.g. `qrcode.react`) and encode the local network IP address of the app so users can scan it from mobile devices on the same network.

## Acceptance Criteria

- The sidebar navigation accurately displays items without the "Navigation" section title.
- The top header actions contain a refresh icon instead of the "Reload menu" text. The icon is clickable and functions identically to before.
- A QR code appears prominently on the desktop and tablet-sized login selection screen.
- Scanning the QR code points to the active port on the local network (e.g. `http://192.168.x.x:3000` or whatever configuration the application dynamically detects) allowing other devices to reach the application.

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped strictly to the `orders-client` UI. Do not alter backend behavior.
- Use lightweight libraries for QR code generation to minimize overhead.
- Handle fallback or local detection gracefully (e.g. if `window.location.hostname` is `localhost`, the QR should ideally encode the LAN IP if achievable, or provide an input/override logic to find the LAN IP).

## Context

- Related files: `apps/orders-client/src/App.tsx`, `apps/orders-client/package.json`
- Related docs: `docs/ui-design-rules.md`
- Source architecture: N/A
- Related flows: UI login, landing page.

## Out of Scope

- Changes to authentication logic.
- Building an entire new UI framework. These are minor iterative styling and component updates.

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- A library like `qrcode.react` can be injected via terminal. Since Vite is running, `window.location.host` can be combined with `http://` or `https://` to form the QR link. Be aware that `localhost` is inaccessible by devices, so consider how the IP is retrieved in development environments by parsing the startup URL or creating a simple helper.