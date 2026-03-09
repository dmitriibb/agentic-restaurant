# AGENTS.md

Repository-level rules for all AI agents (single or multi-agent mode).

## Global Rules

1. Read `flow-index.yaml` before changing domain-related code.
2. Load relevant `domain-brain/` files and apply invariants.
3. Keep `domain-brain/` and `flow-index.yaml` synchronized with implementation changes.
4. Include or update tests for behavior changes.
5. Keep changes scoped to the task; avoid unrelated refactors.
6. Preserve repository conventions and existing project structure.

## Multi-Agent Pipeline

Default pipeline:

`tasks -> planner -> coder -> tester -> reviewer -> PR -> done`

Agent directories:

- `agent/supervisor`
- `agent/planner`
- `agent/coder`
- `agent/tester`
- `agent/reviewer`

## Task Contract

Task files live in `agent/tasks/` and follow `agent/tasks/TASK_TEMPLATE.md`.

For each task id, agents should produce:

- plan: `agent/tasks/<task-id>.plan.md`
- implementation notes: `agent/tasks/<task-id>.coder.md`
- test report: `agent/tasks/<task-id>.test.md`
- review report: `agent/tasks/<task-id>.review.md`

When complete, supervisor moves task artifacts to `agent/done/<task-id>/`.
