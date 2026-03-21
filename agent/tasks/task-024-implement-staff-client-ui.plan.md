# Implementation Plan

## Task Summary
- Implement the redesigned staff-client UI in `apps/staff-client` based on Task 023 outputs, aligning navigation behavior, text-size controls, desktop/tablet/mobile layouts, QR access, and foldable status lanes.
- Keep scope inside `apps/staff-client` (plus minimal shared config only if strictly required).

## Architecture Input
- `source_architecture`: `none`
- Required design/task references:
  - `agent/tasks/task-023-design-staff-client-ui.md` (completion payload with Page 2 boards)
  - `docs/ui-design-rules.md`

## Affected Areas
- App shell and board rendering:
  - `apps/staff-client/src/App.tsx`
- Styling, responsive breakpoints, text-size classes, lane fold visuals:
  - `apps/staff-client/src/styles.css`
- UI behavior test coverage updates:
  - `apps/staff-client/src/App.test.tsx`
- Dependency management for QR rendering:
  - `apps/staff-client/package.json`
  - `apps/staff-client/package-lock.json`
- Optional/minimal env docs if QR setup messaging requires it:
  - `apps/staff-client/.env.example`

## Steps
1. Reconcile design inputs before coding.
   - Read `docs/ui-design-rules.md` and Task 023 completion payload details.
   - Use Penpot MCP to inspect the updated Task 023 designs on "Page 2" (Desktop Application, Tablet Portrait, Mobile Portrait) before implementation decisions.
   - Capture implementation notes for layout, navigation affordances, text-size controls, and QR placement/visibility rules.

2. Establish UI state model in `App.tsx` for new behavior.
   - Add navigation visibility/placement state per viewport mode (desktop/tablet/mobile behavior from rules).
   - Add text-size mode state (3 levels) and wire to root/class toggling strategy.
   - Add per-lane fold/unfold state keyed by lane status for both interactive and display boards.

3. Implement responsive navigation and toolbar actions in `App.tsx`.
   - Refactor existing top toolbar into design-aligned navigation/header controls.
   - Replace verbose button labels with icon-first actions where specified (retain accessible labels/titles).
   - Ensure menu behavior: always-available toggle on desktop/tablet modes and dismissible overlay-style behavior on mobile.

4. Implement text-size controls and application-wide effect.
   - Add control UI (A-/A/A+) in header/menu locations matching Penpot Page 2 guidance.
   - Apply text-size classes consistently so all major text surfaces respond immediately.
   - Persist selected size in client storage (if existing pattern allows) without changing backend contracts.

5. Implement QR access feature for local network usage.
   - Add `qrcode.react` dependency and integrate a staff-client local access QR component.
   - Use `import.meta.env.VITE_LOCAL_IP` to derive URL and render QR when value is present/valid.
   - Hide QR UI on mobile viewport; show on desktop/tablet as required by design.
   - Reference `apps/orders-client/src/App.tsx` QR implementation pattern for safe parity.

6. Implement lane responsiveness and foldable status columns.
   - Ensure board layout behavior: desktop 4 lanes, tablet portrait 2 lanes, mobile 1 lane.
   - Update lane headers to show counts (e.g., `QUEUED (2)`) and fold toggle glyph (`▶`/`▼`).
   - On fold, collapse cards while keeping header, count, and toggle interactive and accessible.
   - Preserve existing polling, order sorting, and interactive detail rail behavior.

7. Update styling in `styles.css` to match redesigned UI.
   - Add/adjust classes for navigation shells, responsive menu states, text-size variants, QR card visibility rules, and folded lane states.
   - Keep visual consistency with repository UI direction and existing staff-client theme primitives.

8. Expand tests in `App.test.tsx` for new UI contracts.
   - Add tests for menu behavior by viewport mode (or class/state toggles where viewport simulation is limited).
   - Add tests for text-size control state/class application.
   - Add tests for lane header counts and fold/unfold toggling.
   - Add tests for QR visibility logic (desktop/tablet visible, mobile hidden behavior via class/state conditions).

9. Run validations and finalize.
   - Execute staff-client tests and build.
   - Confirm no backend/service files changed.
   - Prepare implementation notes in coder artifact with explicit mention of Penpot decisions actually used.

## Risks and Mitigations
- Risk: Penpot design drift vs Task 023 text payload.
  - Mitigation: coder must inspect latest Penpot "Page 2" via MCP first and document reconciled decisions before coding.
- Risk: Responsive behavior regressions due to CSS grid refactor.
  - Mitigation: keep breakpoints explicit and add targeted tests for lane/count/fold behavior.
- Risk: QR rendering introduces dependency/build issues.
  - Mitigation: add dependency only in `apps/staff-client`; verify with `npm run build`.
- Risk: Accessibility loss when moving to icon-first controls.
  - Mitigation: retain semantic buttons with `aria-label` and `title` attributes.

## Tests
- From `apps/staff-client`:
  - `npm install` (only if dependency changes are introduced)
  - `npm run test`
  - `npm run build`
  - `npm run dev` (smoke check: starts without build/runtime errors)

## Domain Documentation Updates
- Expected: none.
- Reason: Task 024 is UI implementation within `apps/staff-client`; no domain entity/flow/state-machine contract changes are planned.
- Verification: ensure no edits to `domain-brain/` or `flow-index.yaml` unless implementation unexpectedly changes domain behavior.

## Handoff Guidance for Coder
- Mandatory first implementation step: retrieve updated Staff Client design details from Penpot MCP "Page 2" before making or finalizing implementation decisions.
- Use Task 023 completion payload as anchor, but treat live Penpot Page 2 artifacts as source of truth for layout details.
- Keep all code changes inside `apps/staff-client` except minimal config/dependency updates required for QR support.
- Preserve existing production data flow, polling cadence, and API contracts while refactoring UI structure.

## Open Questions
- Confirm whether text-size preference should persist across sessions for staff-client (recommended) or reset on each load.
- Confirm whether QR card belongs in persistent sidebar/nav only, or also appears on landing mode-selection screen for tablet/desktop.