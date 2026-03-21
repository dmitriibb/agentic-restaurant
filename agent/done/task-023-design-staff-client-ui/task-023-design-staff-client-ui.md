# Task 023: Design Staff Client UI in Penpot

```yaml
id: task-023-design-staff-client-ui
title: Design Staff Client UI using Penpot MCP
pipeline: implementation
status: done
priority: medium
type: ui-design
architecture: not_requested
source_architecture: ""
retry_count: 0
created_at: 2026-03-20
requested_by: human
areas:
  - apps/staff-client
flows: []
dependencies: []
validation:
  - Penpot designs are created and approved
```

## Summary

Use the Penpot MCP to create UI designs for the `staff-client` app that bring its interaction models and capabilities to parity with the recent `orders-client` UI improvements. The main goals are to align the navigation menu logic, the text enlargement features, and introduce the QR code feature. This visual blueprint will direct the implementation taking place in Task 024.

## Requirements

- Read and follow requirements in `docs/ui-design-rules.md` and the `ui-design-with-penpot` skill.
- Design the navigation menu logic for the `staff-client` to mirror the streamlined behavior used in the `orders-client`.
- Include the "enlarge text" functionality in the design patterns so staff members can increase font sizes via standard UI actions.
- Incorporate a QR code in the design as an access mechanism or feature representation analogous to the local network scanning flow introduced in orders-client.
- Validate that the design conforms to responsive patterns (e.g., tablet usage on a production floor).
- Write down a summary of the finalized Penpot specifications or identifiers in this task's completion payload.

## Acceptance Criteria

- Completed Penpot mockups mapped to the `staff-client` screens.
- Navigation components reflect the `orders-client` architecture visually (icon-driven, uncluttered sidebar).
- Text enlargement controls are clearly placed in header or settings contexts.
- Local network QR code layout exists in a relevant entry or dashboard screen.

## Constraints

- Follow `AGENTS.md` and all loaded skill conventions.
- Only focus on UI design using Penpot. No code implementation is done in this task.
- Document any styling tokens (colors, variants) if established.
- Leave `task-024` untouched while working on this task.

## Context

- Related artifacts: Previous Penpot design runs for `orders-client` (reference how Task 022 was designed).
- Related apps: `apps/staff-client`
- Relevant skill: `skills/ui-design-with-penpot/SKILL.md`

## Out of Scope

- Implementing the React code (This happens in Task 024).
- Creating new backend API flows.

## Notes for Agents

- Remember to use the `ui-design-with-penpot` skill to load the appropriate instructions.
- Ensure the first visible chat message identifies the current role, for example `Working as planner agent.`
- Stage agents append exactly two audit entries for normal execution: `received` and `completed` in the `agents-audit.md` file.

## Completion Payload

(Added 2026-03-20 18:05:16)
- Created **"Desktop Application"** (1280x800) board on "Page 2" with left sidebar matching `orders-client`. Added "Text Size Settings (A-/A/A+)" and "QR Access" scan targets to the sidebar.
- Created **"Tablet Portrait"** (768x1024) board on "Page 2" with top navigation containing hamburger menu, text resize toggles, and QR scanner layout.
- Created **"Mobile Portrait"** (390x844) board on "Page 2" demonstrating a standard kebab menu dropdown accommodating Home, Orders, Text Settings, and Quick QR access.
- Designs match constraints defined in `docs/ui-design-rules.md` perfectly.