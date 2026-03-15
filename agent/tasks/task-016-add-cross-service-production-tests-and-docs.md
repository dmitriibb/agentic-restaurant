# Task: Add cross-service production tests and docs

```yaml
id: task-016-add-cross-service-production-tests-and-docs
title: Add cross-service production tests and docs
pipeline: implementation
status: queued
priority: medium
type: integration
architecture: not_requested
source_architecture: task-010-order-production-pipeline-architecture
retry_count: 0
created_at: 2026-03-14
requested_by: human
areas:
  - apps/orders-service
  - apps/production-service
  - apps/staff-client
  - docker-compose.yml
  - README.md
flows:
  - order_submission
  - order_production
dependencies:
  - task-012-publish-order-item-events-from-orders-service
  - task-013-implement-production-state-store-and-consumers
  - task-014-add-staff-auth-and-production-command-api
  - task-015-build-staff-client-production-board
validation:
  - `mvn test` succeeds in `apps/orders-service`
  - `go test ./...` succeeds in `apps/production-service`
  - `npm test` succeeds in `apps/staff-client`
  - Architecture and runtime docs describe RabbitMQ and production-service startup
```

## Summary

Close the production-pipeline slice with automated cross-service verification and operational documentation for local development and future contributors.

## Requirements

- Add automated coverage for the happy path from accepted order to ready production order.
- Add automated coverage for duplicate item-requested delivery and invalid transition handling.
- Verify local runtime wiring for `orders-service`, RabbitMQ, `production-service`, and `staff-client`.
- Update repository docs with the new service, broker, startup steps, and production flow summary.

## Acceptance Criteria

- Automated tests or scripted checks cover order acceptance, event handoff, item pickup, item ready, and derived order ready behavior.
- Duplicate-delivery handling is explicitly verified.
- Local-development docs mention RabbitMQ, `production-service`, and `staff-client`.
- Remaining gaps or future e2e work are documented clearly if they are not automated in this task.

## Constraints

- Follow `AGENTS.md` rules.
- Keep changes scoped to validation and documentation.
- Do not redesign the architecture during this task.
- Add or update tests for behavior changes introduced by the production pipeline.

## Context

- Related files: `README.md`, `docker-compose.yml`, service test suites
- Related docs: `agent/done/task-010-order-production-pipeline-architecture/task-010-order-production-pipeline-architecture.arch.md`
- Source architecture: `task-010-order-production-pipeline-architecture`
- Related flows: `order_submission`, `order_production`
- Risks or dependencies: integration coverage must reflect the real RabbitMQ handoff rather than only mocked flows where possible.

## Out of Scope

- New product features beyond the agreed production pipeline
- Full browser e2e infrastructure if that requires a separate pipeline decision

## Notes for Agents

- First visible chat message must identify the current role, for example `Working as planner agent.`
- Stage agents append exactly two audit entries for normal execution: `received` and `completed`.
- Add extra stage-agent audit entries only when receiving retry feedback or blocking the task.
- Supervisor appends lifecycle audit entries for pickup, status changes, handoffs, retry routing, blocking, PR handoff, and archival.
- Resolve `source_architecture` from `agent/done/<source_architecture>/<source_architecture>.arch.md` first, with fallback to `agent/tasks/<source_architecture>.arch.md`.
- Prefer validating the real async handoff path instead of only unit-testing isolated pieces.
