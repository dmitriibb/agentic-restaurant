# Architecture Task Template

```yaml
id: task-010-problem-architecture
title: Design architecture for <problem>
pipeline: architecture
status: queued
priority: high
type: architecture
architecture: required
retry_count: 0
created_at: YYYY-MM-DD
requested_by: human
areas:
  - apps/<app-name>
flows: []
dependencies: []
validation:
  - Architecture document exists at agent/tasks/<task-id>.arch.md
  - Split report exists at agent/tasks/<task-id>.split.md
  - Generated implementation tasks use standalone numeric ids such as task-011-<slug>
```

`pipeline` must be `architecture` for design-first work.

Use this template when the user is asking for architecture, design, boundaries, trade-off analysis, or decomposition into implementation tasks.

Architecture tasks end by generating implementation task files for the implementation pipeline. They do not run planner, coder, tester, or reviewer directly.

## Summary

One short paragraph describing the design problem and why architecture is needed before implementation.

## Requirements

- <requirement 1>
- <requirement 2>

## Acceptance Criteria

- An architecture document exists and covers the requested design problem.
- Blocking open questions are either resolved with the user or listed explicitly.
- A split report exists and individual implementation task files were created.
- Generated implementation tasks use `pipeline: implementation`, `architecture: not_requested`, and `source_architecture: <this-task-id>`.

## Constraints

- Follow `AGENTS.md` rules
- Keep changes scoped to architecture and task decomposition
- Update domain knowledge files if the architecture introduces new concrete domain flows or entities
- Do not implement product code in this task

## Context

- Related files:
- Related docs:
- Related flows:
- Risks or dependencies:

## Out of Scope

- Direct implementation work
- Test execution for implementation tasks
- Pull request creation for downstream implementation tasks

## Notes for Agents

- First visible chat message must identify the current role.
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- Add extra stage-agent audit entries only when receiving retry feedback or blocking the task.
- Supervisor appends lifecycle audit entries for pickup, status changes, handoffs, retry routing, blocking, PR handoff, and archival.
- The architect owns `arch.md`.
- The task-splitter owns `split.md` and generated implementation task files.
