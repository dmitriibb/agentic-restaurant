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

## Multi-Agent Pipeline

Default execution flow:

`tasks -> supervisor -> planner -> coder -> tester -> reviewer -> PR handoff -> done`

Optional execution flow:

`tasks -> supervisor -> architect -> planner -> coder -> tester -> reviewer -> PR handoff -> done`

Architect usage rules:

- `agent/architect` is optional.
- Run `agent/architect` only when the user explicitly requests architecture or design work in the task or prompt.
- Do not invoke `agent/architect` automatically based on agent judgment alone.
- When the architect stage is used, it must produce `agent/tasks/<task-id>.arch.md`.

Agent directories:

- `agent/supervisor`
- `agent/architect`
- `agent/planner`
- `agent/coder`
- `agent/tester`
- `agent/reviewer`

## Task Contract

Task files live in `agent/tasks/` and follow `agent/tasks/TASK_TEMPLATE.md`.

Task metadata should be structured and include, at minimum:

- `id`
- `title`
- `status`
- `priority`
- `type`
- `architecture`
- `retry_count`
- affected `areas`
- affected `flows`
- validation commands or checks

Valid task statuses: `queued`, `in_progress`, `planning`, `implementing`, `testing`, `reviewing`, `changes_required`, `approved`, `pr_created`, `done`, `blocked`. The supervisor updates the status at each pipeline stage transition.

For each task id, agents should produce:

- optional architecture design: `agent/tasks/<task-id>.arch.md`
- plan: `agent/tasks/<task-id>.plan.md`
- implementation notes: `agent/tasks/<task-id>.coder.md`
- test report: `agent/tasks/<task-id>.test.md`
- review report: `agent/tasks/<task-id>.review.md`

When architecture is not explicitly requested, `agent/tasks/<task-id>.arch.md` is not expected.

`PR handoff` is a pipeline stage, not a separate agent directory.

When complete, supervisor moves the task file and all produced artifacts to `agent/done/<task-id>/`.

## Feedback and Retry

When the tester reports failures or the reviewer returns `CHANGES_REQUIRED`:

1. The supervisor classifies the root cause.
2. The supervisor routes feedback to the correct upstream agent (planner for plan issues, coder for implementation/test/domain issues).
3. The pipeline resumes from that agent forward.
4. Maximum 2 retry cycles per task. After 2 retries, status becomes `blocked` and requires human intervention.

See `agent/supervisor/AGENT.md` for the full routing table and `agent/pipeline.yaml` for the machine-readable definition.
