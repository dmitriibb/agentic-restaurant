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
- `order_production`

## Authorization Model (Current)

- End-user calls use `Authorization: Bearer <jwt>`.
- Internal service calls use `X-Service-Token`.
- `orders-service` also enforces request ownership (`token.userId` must match `request.userId`).

## Planned Expansion

Planned domains include:

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
- Node.js 20+ with npm workspaces support (for local web UI development, including `apps/ui-common-libs`)
- GitHub CLI (`gh`) if you use HTTPS remotes and want shared GitHub authentication across local repositories

## Frontend Workspace Setup

The frontend packages now use npm workspaces from the repository root:

- `apps/orders-client`
- `apps/staff-client`
- `apps/ui-common-libs`

Install frontend dependencies once from the repository root:

- `npm install`

Common frontend commands from the repository root:

- `npm run build:frontend`
- `npm run test:frontend`
- `npm run dev:orders-client`
- `npm run dev:staff-client`
- `npm run dev:ui-common-libs`

Workspace packages are linked locally inside the monorepo. Shared library builds stay under `apps/ui-common-libs/dist` rather than being published to a global npm location during normal local development.

Run all services via Compose:

- Windows: `run.cmd up`
- Linux/macOS: `./run.sh up`

Then open:

- Orders UI: `http://localhost`
- Staff UI: `http://localhost:8085`
- Users Swagger: `http://localhost:8081/swagger-ui.html`
- Menu Swagger: `http://localhost:8082/swagger-ui.html`
- Orders Swagger: `http://localhost:8083/swagger-ui.html`
- Production health: `http://localhost:8084/health/ready`
- RabbitMQ UI: `http://localhost:15672` (`guest` / `guest`)

## Shared UI Library

- Shared React components and theme tokens now live in `apps/ui-common-libs`.
- The package wraps Material UI behind repository-approved primitives so `orders-client`, `staff-client`, and future web UIs can stay visually consistent.
- When a web UI needs a new button, card, form field, badge, or layout shell, add it to `apps/ui-common-libs` first and consume it from there rather than creating app-local variants.

## Production Pipeline Validation

Run the cross-service smoke check after the stack is up:

```powershell
powershell -ExecutionPolicy Bypass -File tests/production-pipeline-smoke.ps1
```

The script validates:

- readiness for `users-service`, `menu-service`, `orders-service`, `production-service`, and `staff-client`
- RabbitMQ queue topology for production intake
- accepted order handoff from `orders-service` into `production-service`
- staff pickup and ready commands leading to a derived `READY` production order state

You can override credentials and base URLs with script parameters if your local setup differs.
