# Task Template

```yaml
id: task-001-short-slug
title: Short implementation task title
pipeline: implementation
status: queued
priority: medium
type: feature
architecture: not_requested
source_architecture:
retry_count: 0
created_at: YYYY-MM-DD
requested_by: human
areas:
  - apps/<app-name>
flows: []
dependencies: []
validation:
  - <command-or-check>
```

`pipeline` must be `implementation` for executable work items.

`architecture` must stay `not_requested` for implementation tasks. If the task comes from an approved architecture, set `source_architecture` instead of flipping `architecture` back to `required`.

`source_architecture` is optional. When present, store the architecture task id only, for example `task-010-checkout-architecture`.

Do not create implementation task ids with letter suffixes such as `task-009-A`. Use standalone sequential ids such as `task-011-migrate-db`.

`status` valid values: `queued`, `in_progress`, `planning`, `implementing`, `testing`, `reviewing`, `changes_required`, `approved`, `pr_created`, `done`, `blocked`.

`retry_count` starts at 0. The supervisor increments it on each feedback cycle. Maximum: 2.

Every task execution must also maintain `agent/tasks/<task-id>.agents-audit.md` as the shared audit trail for all agents.

## Summary

One short paragraph describing the desired outcome.

## Requirements

- <requirement 1>
- <requirement 2>

## Acceptance Criteria

- <observable outcome 1>
- <observable outcome 2>

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to the task
- Update domain knowledge files when concrete business logic changes
- Add or update tests for behavior changes

## Context

- Related files:
- Related docs:
- Source architecture:
- Related flows:
- Risks or dependencies:

## Out of Scope

- <explicit non-goal>

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Append audit entries to `agent/tasks/<task-id>.agents-audit.md` when starting, handing off, retrying, blocking, and finishing work.
- Resolve `source_architecture` from `agent/done/<source_architecture>/<source_architecture>.arch.md` first, with fallback to `agent/tasks/<source_architecture>.arch.md`.
- <handoff note or implementation hint>
