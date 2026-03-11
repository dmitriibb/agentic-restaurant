# Task Template

```yaml
id: task-001
title: Short task title
status: queued
priority: medium
type: feature
architecture: not_requested
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

`architecture` must stay `not_requested` unless the user explicitly asked for architecture or design work.

`status` valid values: `queued`, `in_progress`, `planning`, `implementing`, `testing`, `reviewing`, `changes_required`, `approved`, `pr_created`, `done`, `blocked`.

`retry_count` starts at 0. The supervisor increments it on each feedback cycle. Maximum: 2.

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
- Related flows:
- Risks or dependencies:

## Out of Scope

- <explicit non-goal>

## Notes for Agents

- <handoff note or implementation hint>
