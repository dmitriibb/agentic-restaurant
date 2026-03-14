# AGENTS.md

Repository-level rules for all AI agents (single or multi-agent mode).

## Global Rules

1. Read `flow-index.yaml` before changing domain-related code.
2. Load relevant `domain-brain/` files and apply invariants.
3. Keep `domain-brain/` and `flow-index.yaml` synchronized with implementation changes.
4. Include or update tests for behavior changes.
5. Keep changes scoped to the task; avoid unrelated refactors.
6. Preserve repository conventions and existing project structure.
7. This repository is a generic foundation. `domain-brain/` and `flow-index.yaml` may remain template-like until the first concrete project flow is introduced. When adapting this repo to a real product, seed project-specific domain knowledge before implementing business logic.
8. In multi-agent execution, keep a per-task audit log at `agent/tasks/<task-id>.agents-audit.md` and append entries whenever an agent starts work, hands off work, retries work, blocks work, or completes its stage.
9. The first chat message from each fresh agent must explicitly identify the role, for example: `Working as planner agent.`

## Multi-Agent Pipeline

Implementation pipeline:

`tasks -> supervisor -> planner -> coder -> tester -> reviewer -> PR handoff -> done`

Architecture pipeline:

`tasks -> supervisor -> architect -> task-splitter -> done`

Pipeline routing rules:

- `agent/architect` is not part of the implementation pipeline.
- Run the architecture pipeline only when the user explicitly requests architecture or design work in the task or prompt.
- Do not invoke `agent/architect` automatically based on agent judgment alone.
- The architecture pipeline must end by creating implementation-ready task files with standalone numeric task ids such as `task-011-migrate-db`, not letter-suffixed child ids such as `task-009-A`.
- Skills may be used as convenience shortcuts in some environments, but pipeline selection must be driven by task metadata and supervisor routing, not by skill names alone.

Pipeline selection rules:

- `pipeline: implementation` is the default for executable work on existing task files.
- `pipeline: architecture` is used for design work that should result in an architecture artifact plus generated implementation tasks.
- When a prompt arrives before any task file exists, the supervisor should infer the initial pipeline from intent:
  - prompts about design, architecture, boundaries, trade-offs, or "split this architecture into tasks" -> architecture pipeline
  - prompts about implementing, fixing, or "work on task ..." -> implementation pipeline
  - prompts about e2e, playwright, or end-to-end testing should reserve `pipeline: e2e` for a future dedicated pipeline instead of overloading the two pipelines above

Agent directories:

- `agent/supervisor`
- `agent/architect`
- `agent/task-splitter`
- `agent/planner`
- `agent/coder`
- `agent/tester`
- `agent/reviewer`

## Task Contract

Task files live in `agent/tasks/`.

- Implementation tasks follow `agent/tasks/TASK_TEMPLATE.md`.
- Architecture tasks follow `agent/tasks/ARCHITECTURE_TASK_TEMPLATE.md`.

Task metadata should be structured and include, at minimum:

- `id`
- `title`
- `pipeline`
- `status`
- `priority`
- `type`
- `architecture`
- optional `source_architecture`
- `retry_count`
- affected `areas`
- affected `flows`
- validation commands or checks

Task lineage rules:

- Do not encode decomposition lineage with `A/B/C` task id suffixes.
- Keep implementation task ids independently schedulable and globally ordered, for example `task-011-migrate-db`, `task-012-add-auth-endpoint`.
- Use `source_architecture: <architecture-task-id>` on implementation tasks created from an architecture task.
- Implementation agents resolve `source_architecture` from `agent/done/<source_architecture>/<source_architecture>.arch.md` first, and fall back to `agent/tasks/<source_architecture>.arch.md` only if the architecture task has not been archived yet.

Valid task statuses: `queued`, `in_progress`, `designing`, `splitting`, `planning`, `implementing`, `testing`, `reviewing`, `changes_required`, `approved`, `pr_created`, `done`, `blocked`. The supervisor updates the status at each pipeline stage transition.

For each task id, agents should produce:

- execution audit log: `agent/tasks/<task-id>.agents-audit.md`
- architecture task only: `agent/tasks/<task-id>.arch.md`
- architecture task only: `agent/tasks/<task-id>.split.md`
- implementation task only: `agent/tasks/<task-id>.plan.md`
- implementation task only: `agent/tasks/<task-id>.coder.md`
- implementation task only: `agent/tasks/<task-id>.test.md`
- implementation task only: `agent/tasks/<task-id>.review.md`

When architecture is not explicitly requested, `agent/tasks/<task-id>.arch.md` is not expected on the implementation task itself. Implementation tasks should consume approved architecture through `source_architecture`.

`PR handoff` is a pipeline stage, not a separate agent directory.

When complete:

- implementation pipeline: supervisor moves the task file and its produced artifacts to `agent/done/<task-id>/`
- architecture pipeline: supervisor moves the architecture task and its `arch.md` and `split.md` artifacts to `agent/done/<task-id>/`, while the generated implementation task files remain in `agent/tasks/`

## Agent Audit Log

The per-task audit file is the visible execution history of the pipeline.

- File name: `agent/tasks/<task-id>.agents-audit.md`
- Owner: every agent appends to the same file for the current task
- Purpose: show that the multi-agent setup is active and what each agent is doing

Each audit event should use this two-line format:

```text
YYYY-MM-DD HH:MM:SS - <agent-name>
<short action description>
```

Every agent must log exactly two entries per normal stage execution:

1. **Received**: logged immediately when the agent receives the task, before any processing.
2. **Completed**: logged when the agent finishes work, describing what was done and who the task is being passed to.

Additional entries are required when:

- receiving retry feedback
- blocking the task

Example:

```text
2026-03-11 15:10:20 - supervisor
received task, starting pipeline coordination

2026-03-11 15:10:30 - supervisor
completed initial routing, passing task to planner

2026-03-11 15:10:30 - planner
received task from supervisor, starting implementation plan

2026-03-11 15:10:45 - planner
completed implementation plan, passing task to coder
```

## Feedback and Retry

When the tester reports failures or the reviewer returns `CHANGES_REQUIRED`:

1. The supervisor classifies the root cause.
2. The supervisor routes feedback to the correct upstream agent.
3. The pipeline resumes from that agent forward.
4. Maximum 2 retry cycles per task. After 2 retries, status becomes `blocked` and requires human intervention.

If an implementation task exposes a missing or incorrect architecture decision, do not inject `agent/architect` back into the implementation pipeline. The supervisor should stop or block the implementation task and open or route a separate `pipeline: architecture` task.

See `agent/supervisor/AGENT.md` for the full routing table and `agent/pipeline.yaml` for the machine-readable definition.
