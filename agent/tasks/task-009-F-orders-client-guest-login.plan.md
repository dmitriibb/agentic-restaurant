# Implementation Plan

## Scope
Implement Task F in `apps/orders-client`: app-token module, guest login flow, session updates, order confirmation display update, env vars, and tests.

## Inputs Reviewed
- `flow-index.yaml`
- `domain-brain/flows/user-authentication.md`
- `domain-brain/flows/menu-browsing.md`
- `domain-brain/flows/order-submission.md`
- `agent/tasks/task-009-F-orders-client-guest-login.md`
- `agent/tasks/task-009-user-types-and-guest-access.arch.md` (Task F sections)

## Steps
1. Extend frontend config with `VITE_APP_NAME` and `VITE_APP_SECRET`.
2. Extend auth API module with app-token acquisition and guest creation calls.
3. Add app-token manager module with module-scoped cache, 80% refresh, and retry/backoff.
4. Extend auth session typing to preserve `clientType`.
5. Update `App.tsx` for dual entry authentication (registered + guest), guest display name validation, and auto app-token warmup on page load.
6. Update order confirmation rendering to show user id and display name.
7. Extend order response type with `userDisplayName`.
8. Update `.env.example` with app auth env vars.
9. Verify nginx auth proxy coverage for new endpoints (`/api/v1/auth/*` already covers both required routes).
10. Update and add tests (`App.test.tsx`, new `appToken.test.ts`).
11. Run `npm test` and `npm run build` in `apps/orders-client`.
