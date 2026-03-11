# Implementation Plan

## Task Summary
- Implement complete `orders-client` user flow: login, token persistence/reuse, menu browsing, basket management, and order submission with confirmation.

## Architecture Input
- `not requested`
- aligned with `agent/tasks/task-restaurant-platform-architecture-001.arch.md` feature boundaries (`auth`, `menu`, `basket`, `orders`).

## Affected Areas
- `apps/orders-client/src/App.tsx`
- `apps/orders-client/src/styles.css`
- `apps/orders-client/src/App.test.tsx`
- `apps/orders-client/src/features/auth/*`
- `apps/orders-client/src/features/menu/*`
- `apps/orders-client/src/features/basket/*`
- `apps/orders-client/src/features/orders/*`
- `apps/orders-client/README.md`

## Steps
1. Implement auth API + session storage helpers for token and user state.
2. Implement menu API with bearer token header.
3. Implement basket model helpers for add/update/remove behavior.
4. Implement order API with idempotent `PUT` request id and typed payload.
5. Replace shell UI with functional login/menu/basket/checkout flow and responsive layout.
6. Add/replace tests to validate full happy-path flow and token reuse in protected calls.
7. Run client validation commands and produce task artifacts.

## Tests
- `npm test`
- `npm run build`

## Domain Documentation Updates
- none required; client paths remain within existing `flow-index.yaml` mappings and flow behavior matches `domain-brain` docs.

## Open Questions
- none
