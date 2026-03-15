# agentic-restaurant

Agentic-first monorepo for building a restaurant platform with microservices.

This project now has a concrete product direction (restaurant operations) while keeping the original goal: use fully agentic development, iterate on multi-agent workflows, and experiment with different technologies per domain.

## Project Goals

1. Build a real restaurant platform as a set of independently deployable services.
2. Evolve a practical multi-agent delivery pipeline (planning, coding, testing, review, handoff).
3. Use the product as a safe environment to compare stacks, patterns, and service boundaries.

## Implemented Flows

Current flows are captured in `flow-index.yaml` and documented in `domain-brain/`:

- `user_authentication`
- `menu_browsing`
- `order_submission`

## Authorization Model (Current)

- End-user calls use `Authorization: Bearer <jwt>`.
- Internal service calls use `X-Service-Token`.
- `orders-service` also enforces request ownership (`token.userId` must match `request.userId`).

## Planned Expansion

Planned domains include:

- production line / kitchen workflow
- payments
- inventory
- reporting and analytics
- additional supporting services as complexity grows

As new domains are added, the repository will keep the same discipline:

1. Add/extend domain knowledge in `domain-brain/`.
2. Register flows and code paths in `flow-index.yaml`.
3. Implement service/API changes with tests.
4. Run through the multi-agent pipeline and task artifacts.

## Agentic Workflow Foundation

- `agent/` contains supervisor/planner/coder/tester/reviewer roles and task artifacts.
- `domain-brain/` stores distilled product knowledge (entities, flows, invariants, edge cases).
- `flow-index.yaml` maps flows to code areas for agents and contributors.
- `skills/` stores reusable skill instructions.

See `agent/README.md` and `AGENTS.md` for operational workflow rules.

## Quick Start

Prerequisites:

- Docker + Docker Compose
- Java 21 + Maven (for local non-container runs)
- Node.js (for local `orders-client` development)

Run all services via Compose:

- Windows: `run.cmd up`
- Linux/macOS: `./run.sh up`

Then open:

- UI: `http://localhost`
- Users Swagger: `http://localhost:8081/swagger-ui.html`
- Menu Swagger: `http://localhost:8082/swagger-ui.html`
- Orders Swagger: `http://localhost:8083/swagger-ui.html`
