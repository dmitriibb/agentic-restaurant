# agentic-restaurant

Monorepo experiment for fully agentic development of complex restaurant software.

## Purpose

This repository is used to:

1. Explore and gain experience with agentic development approaches, patterns, and strategies.
2. Design and implement web applications for restaurants (orders, payments, inventory, staff, and related operations).
3. Gain hands-on experience with different technologies (Java, Kotlin, Go, React, databases, messaging systems, monitoring stack, and more).

## Scope

- This repository starts with workflow and knowledge scaffolding for agentic development.
- Service/application architecture and implementation will be added incrementally.
- No production service architecture is defined at this stage.

## Agentic Workflow Foundation

The initial structure follows patterns documented in [`agentic workflow patterns.md`](./agentic%20workflow%20patterns.md):

- `domain-brain/` for distilled domain knowledge
- `flow-index.yaml` for flow-to-code routing hints
- `skills/` for repeatable agent workflows
- `scripts/domain-sync.ts` for future domain sync automation

## Multi-Agent Workflow

The repository now includes a multi-agent scaffold based on [`milti-agent-pattenr.md`](./milti-agent-pattenr.md):

- `agent/supervisor/` - orchestrates task lifecycle
- `agent/planner/` - converts tasks into executable plans
- `agent/coder/` - implements code changes from plans
- `agent/tester/` - validates with tests and checks
- `agent/reviewer/` - performs automated review before PR
- `agent/tasks/` - incoming task queue
- `agent/done/` - completed task archive

Pipeline:

`tasks -> planner -> coder -> tester -> reviewer -> PR -> done`

## Current Repository Skeleton

- `apps/` and `packages/` for monorepo applications and shared modules
- `services/`, `repositories/`, `controllers/` reserved for future implementation
- `tests/` reserved for automated test suites
- no concrete service architecture is defined yet
