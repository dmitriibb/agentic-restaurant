# Coder Report

## Implemented Changes
- Implemented Mongo-backed menu persistence with explicit long ids using `MenuItemDocument` + `MenuItemRepository`.
- Added startup data seeding for four menu items with long identifiers and decimal-safe prices.
- Implemented authenticated public menu endpoint `GET /api/v1/menu-items`.
- Implemented internal resolve endpoint `POST /api/v1/internal/menu-items/resolve` with service-token protection.
- Added users-service token validation client (`AuthValidationClient`) for public endpoint auth enforcement.
- Updated `application.yml` and `application-local.yml` with auth/service-token configuration.
- Replaced OpenAPI placeholder with concrete public/internal endpoint contract.
- Updated README with implemented endpoint details.
- Replaced tests with integration coverage for auth enforcement, lookup behavior, and existing readiness/Mongo checks.

## Tests Added or Updated
- Updated `MenuServiceApplicationTests` to verify:
  - authenticated menu fetch
  - missing auth rejection
  - invalid token rejection
  - internal resolve found/missing ids behavior
  - internal endpoint service-token requirement
  - Mongo readiness/connectivity

## Domain Documentation Updates
- No `domain-brain/` changes required; implementation aligns with current invariants:
  - menu data ownership stays in `menu-service`
  - menu item ids are long values
  - protected requests are rejected when token validation fails
  - internal endpoints require service credentials

## Assumptions
- Menu-service treats users-service validation failures as authentication failures (`401`) to fail closed.
- Shared token header is the initial service-to-service trust mechanism for internal endpoint access.

## Known Limitations
- No admin CRUD APIs for menu management.
- Token validation dependency is synchronous and may be optimized later with local JWT verification/JWKS.
