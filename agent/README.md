# Agent System

This folder contains the multi-agent workflow scaffold used by this repository.

## Roles

- `supervisor`: orchestrates task execution and handoffs
- `architect`: optional design stage, used only when the user explicitly requests architecture/design work
- `planner`: converts task requirements into a concrete plan
- `coder`: implements the approved plan
- `tester`: validates implementation with automated checks
- `reviewer`: performs automated review and gatekeeping

## Queue

- Put new tasks in `agent/tasks/`.
- Use `agent/tasks/TASK_TEMPLATE.md` as the task format.
- Store per-task artifacts in task-scoped files during execution.
- Set `architecture: required` in the task metadata only when the user explicitly asked for architecture/design work.
- On completion, move task and artifacts to `agent/done/<task-id>/`.

## Pipelines

Default:

`tasks -> supervisor -> planner -> coder -> tester -> reviewer -> PR handoff -> done`

Optional:

`tasks -> supervisor -> architect -> planner -> coder -> tester -> reviewer -> PR handoff -> done`
