# AGENTS.md

Repository-level rules for all AI agents (single or multi-agent mode).

## Routing Gate (Mandatory)

Apply this gate before any file reads, planning, or implementation.

1. Precedence rules (deterministic):
   - If prompt starts with `multi-agent implementation` -> ALWAYS run implementation pipeline as `supervisor` first.
   - If prompt starts with `multi-agent architecture` -> ALWAYS run architecture pipeline as `supervisor` first.
   - Otherwise -> run default single-agent mode.
2. In multi-agent mode, non-supervisor roles cannot start directly.
3. Any run that violates this gate is invalid and must be restarted from `supervisor`.

## First Message Contract

The first assistant message must include role and route confirmation.

- Multi-agent implementation: `Working as supervisor agent.`
- Multi-agent architecture: `Working as supervisor agent.`
- Default mode: `Working as default agent.`

The same first message must also explicitly confirm:

- detected mode
- selected pipeline
- target task id (if provided by user)

If any required field is missing, stop and restart with a valid first message.

## Global Rules

1. Read `flow-index.yaml` before changing domain-related code.
2. Load relevant `domain-brain/` files and apply invariants.
3. Keep `domain-brain/` and `flow-index.yaml` synchronized with implementation changes.
4. Include or update tests for behavior changes.
5. Keep changes scoped to the task; avoid unrelated refactors.
6. Preserve repository conventions and existing project structure.
7. In multi-agent execution, keep a per-task audit log at `agent/tasks/<task-id>.agents-audit.md` during execution and archive it with the task on completion.
8. The first chat message from each fresh agent must explicitly identify the role, for example: `Working as planner agent.`
9. All timestamps in audit logs and task metadata MUST come from the host machine's system clock. Use the `get-local-time` skill (`skills/get-local-time/SKILL.md`). NEVER fabricate, estimate, or hardcode timestamps. Each entry requires a fresh time fetch.
10. In multi-agent execution, each pipeline stage MUST be executed in a fresh, isolated agent context. The supervisor MUST NOT role-play other agents within its own context. Use the `run-pipeline-stage` skill (`skills/run-pipeline-stage/SKILL.md`) for platform-specific delegation mechanisms (e.g., `runSubagent` in Copilot, native orchestration in Codex). Simulating multiple roles in a single agent context is an invalid execution.
11. If the task involves UI changes (frontend apps, React, HTML, or CSS), read `docs/ui-design-rules.md` before making any UI modifications to ensure consistency across all client applications.

## Required Skills

All agents must load and apply these skills when applicable:

| Skill | Path | When to use |
|-------|------|-------------|
| get-local-time | `skills/get-local-time/SKILL.md` | Before writing ANY timestamp (audit logs, task metadata, any dated output) |
| run-pipeline-stage | `skills/run-pipeline-stage/SKILL.md` | Supervisor: before handing off to any execution-stage agent |
| maintain-domain-brain | `skills/maintain-domain-brain/SKILL.md` | Any code change touching business logic, domain entities, flows, or state transitions |


## Agents rules

### Default agent

If Agents flow is not mentioned explicitly, work as a default all-purpose agent.

### Multi-Agent Implementation

- When to use: if prompt / input starts with `multi-agent implementation` (exact prefix match, case-insensitive)
- Implementation pipeline: `tasks -> supervisor -> planner -> coder -> tester -> reviewer -> PR handoff -> done`


### Multi-Agent Architecture

- When to use: if prompt / input starts with `multi-agent architecture` (exact prefix match, case-insensitive)
- Architecture pipeline: `tasks -> supervisor -> architect -> task-splitter -> done`

Pipeline routing rules:

- Routing gate precedence in this file is mandatory and overrides heuristic routing.
- In multi-agent mode, only `agent/supervisor` may initiate the pipeline.
- `agent/architect` is not part of the implementation pipeline.
- Run the architecture pipeline only when the user explicitly requests architecture or design work in the task or prompt.
- Do not invoke `agent/architect` automatically based on agent judgment alone.
- The architecture pipeline must end by creating implementation-ready task files with standalone numeric task ids such as `task-011-migrate-db`, not letter-suffixed child ids such as `task-009-A`.

Routing examples:

- `multi-agent implementation - work on task 012, when finish - commit changes` -> implementation pipeline via `supervisor`.
- `multi-agent architecture - design event contracts for production board` -> architecture pipeline via `supervisor`.
- `implement task 012` -> default mode (single agent), unless user explicitly uses a multi-agent trigger prefix.


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

The supervisor is the audit-log exception. It appends lifecycle entries whenever it picks up a task, changes status, hands work to another stage, routes retry feedback, blocks a task, marks PR handoff, or archives a task.

Execution-stage agents (`architect`, `task-splitter`, `planner`, `coder`, `tester`, `reviewer`) must log exactly two entries per normal stage execution:

1. **Received**: logged immediately when the agent receives the task, before any processing.
2. **Completed**: logged when the agent finishes work, describing what was done and who the task is being passed to.

Additional execution-stage agent entries are required when:

- receiving retry feedback
- blocking the task

Audit logs are execution evidence, not paperwork. They must be produced by the agent while doing that stage, not synthesized afterward.

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

If any required implementation stage was skipped entirely, the task is not complete even if code was written. The supervisor must resume from the earliest missing stage and continue forward, or mark the task `blocked`. Retroactive artifact creation does not satisfy this requirement.

See `agent/supervisor/AGENT.md` for the full routing table and `agent/pipeline.yaml` for the machine-readable definition.

## Routing Validation (Mandatory)

The following conditions invalidate an execution run. If any are detected, the agent must stop and restart correctly:

1. Prompt matches a multi-agent trigger prefix but first assistant line is not `Working as supervisor agent.`
2. First assistant message does not include detected mode, selected pipeline, and task id (when provided).
3. `agent/tasks/<task-id>.agents-audit.md` is not created immediately for multi-agent execution.
4. Any audit log timestamp was not fetched from the host system clock via the `get-local-time` skill.
5. Any pipeline stage was executed by the supervisor role-playing instead of invoking a fresh agent context per the `run-pipeline-stage` skill.
