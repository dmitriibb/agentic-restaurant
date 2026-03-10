# agentic-restaurant

Generic monorepo foundation for agentic development workflows.

## Purpose

This repository is used to:

1. Explore and gain experience with agentic development approaches, patterns, and strategies.
2. Refine a reusable workflow foundation that can be adapted to concrete products later.
3. Gain hands-on experience with agent orchestration, structured tasking, and domain-aware development patterns.

## Scope

- This repository starts as a reusable workflow and knowledge scaffold.
- Concrete application architecture and implementation will be added incrementally under `apps/`.
- No product-specific business domain is defined at this stage.

## Agentic Workflow Foundation

The initial structure follows patterns documented in [`agentic workflow patterns.md`](./agentic%20workflow%20patterns.md):

- `domain-brain/` for distilled domain knowledge
- `flow-index.yaml` for flow-to-code routing hints
- `skills/` for repeatable agent workflows
- `scripts/domain-sync.ts` for future domain sync automation

## Multi-Agent Workflow

The repository includes a multi-agent scaffold based on [`milti-agent-pattenr.md`](./milti-agent-pattenr.md):

- `agent/supervisor/` - orchestrates task lifecycle
- `agent/architect/` - optional architecture/design stage when explicitly requested by the user
- `agent/planner/` - converts tasks into executable plans
- `agent/coder/` - implements code changes from plans
- `agent/tester/` - validates with tests and checks
- `agent/reviewer/` - performs automated review before PR
- `agent/tasks/` - incoming task queue
- `agent/done/` - completed task archive

Default pipeline:

`tasks -> supervisor -> planner -> coder -> tester -> reviewer -> PR handoff -> done`

Optional pipeline:

`tasks -> supervisor -> architect -> planner -> coder -> tester -> reviewer -> PR handoff -> done`

## Current Repository Skeleton

- `apps/` for concrete applications inside the monorepo
- `tests/` for repository-level automated test suites
- `domain-brain/` and `flow-index.yaml` stay generic until a concrete project is introduced
- no product-specific architecture is defined yet
