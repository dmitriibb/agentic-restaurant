# Task 024: Implement Staff Client UI 

```yaml
id: task-024-implement-staff-client-ui
title: Implement the redesigned UI inside Staff Client App
pipeline: implementation
status: done
priority: medium
type: feature
architecture: not_requested
source_architecture: ""
retry_count: 2
created_at: 2026-03-20
requested_by: human
areas:
  - apps/staff-client
flows: []
dependencies: 
  - task-023-design-staff-client-ui
validation:
  - npm run dev in staff-client starts without build errors
```

## Summary

This task is responsible for implementing the new UI design constructed in `task-023` to modernize the `staff-client` app. The implementation must mirror the UI changes applied to `orders-client`, focusing on replacing the old navigation model, adding dynamic "enlarge text" features, and rendering a QR Code that points to the dynamic Local IP of the system to aid quick access for staff devices.

## Requirements

- Before starting implementation, read `agent/done/task-023-design-staff-client-ui` artifacts to extract the final design constraints from Penpot.
- Apply the new navigation menu logic to `staff-client`, updating sidebars and header behaviors according to `.plan` and design notes.
- Integrate "enlarge text" logic so that font sizing across the `staff-client` views can switch or scale up securely (e.g., updating Tailwind generic classes, CSS variables, or context-level sizing).
- Add the `qrcode.react` package (or equivalent) to `apps/staff-client` and import a functional, dynamically generated local QR code component using the `VITE_LOCAL_IP` environment variable system (Note: QR code should NOT be displayed on mobile views, per design).
- Ensure buttons rely on icons vs verbose text strings where specified (e.g. replacing 'Refresh' with '🔄').
- **Implement Responsive Kanban Dashboard**: Adjust the staff dashboard layout based on viewport size. 
  - **Desktop**: 4 columns.
  - **Tablet Portrait**: 2 columns wrapping naturally.
  - **Mobile**: 1 logical column.
- **Implement Foldable Status Columns**: Column headers must display the total count of items (e.g. `QUEUED (2)`). Clicking the status header should fold or unfold the column's items (toggling between a `▶` and `▼` indicator) to optimize vertical screen space, particularly on mobile and tablet.

## Acceptance Criteria

- The navigation UI renders smoothly and functionally resembles the newer `orders-client` architecture.
- The user can trigger a text enlargement feature which immediately resizes active text on the staff screens (useful for viewing cooking orders from a slight distance).
- The `staff-client` landing or dashboard screen displays a dynamically generated QR Code linking to the staff view (e.g., `http://192.168.x.x:5174`), visible on desktop/tablet but hidden on mobile.
- **Dashboard Responsiveness & Folding:** The dashboard correctly switches between 4-column (desktop), 2-column (tablet list), and 1-column (mobile) formats. Clicking a status column header successfully folds/unfolds the order cards within it, displaying accurate order counts and the visual `▶/▼` toggle icon.
- All code changes strictly exist within `apps/staff-client` and any shared build orchestrations as needed.
- `staff-client` must successfully build and start.

## Constraints

- Follow `AGENTS.md` rules.
- Do not affect the backend flows (`orders-service`, `production-service`), only update the UI components and store interactions in the client.
- Ensure that dynamic IP infrastructure changes added for Vite via Docker continue to route to the staff environment variables successfully.

## Context

- Related apps: `apps/staff-client/`
- Prior implementations for reference: `apps/orders-client/src/App.tsx` (Task 022 implementation)

## Out of Scope

- Editing the visual Penpot Mockups natively.
- Changing `staff-client` routing rules or adding new paths, this is strictly a UI/UX update mapping over existing paths.

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- During `coder` agent's time, look into how `orders-client` implements its QR code injection (`VITE_LOCAL_IP`) to mirror the implementation safely.