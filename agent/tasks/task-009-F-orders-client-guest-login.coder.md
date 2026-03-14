# Coder Report

## Implemented
- Added `appAuthConfig` to `apps/orders-client/src/shared/api/config.ts` exposing:
  - `VITE_APP_NAME` (default `orders-client`)
  - `VITE_APP_SECRET` (default `orders-client-secret`)
- Extended `apps/orders-client/src/features/auth/api.ts`:
  - `ClientType` union
  - `displayName`/`clientType` fields in `UserSummary`
  - `acquireAppToken(name, secret)` -> `POST /api/v1/auth/applications/token`
  - `createGuestUser(displayName, appToken)` -> `POST /api/v1/auth/guests`
- Added new module `apps/orders-client/src/features/auth/appToken.ts`:
  - module-scoped cached token
  - deduplicated in-flight acquisition
  - refresh timer at 80% of `expiresInSeconds`
  - retry/backoff with console logging on acquisition failures
- Updated `apps/orders-client/src/features/auth/session.ts` to retain `clientType` and enforce stronger session shape validation.
- Updated `apps/orders-client/src/features/orders/api.ts` to include `userDisplayName` in `OrderSubmitResponse`.
- Reworked `apps/orders-client/src/App.tsx`:
  - dual home entry options: `Login (Registered)` and `Continue as Guest`
  - guest form with client validation (`trim`, non-blank, max 100 chars)
  - guest flow uses app token + guest creation endpoint, then stores session in `sessionStorage`
  - app token warmup on page load via `useEffect`
  - order confirmation now shows user display name + id
  - registered login flow preserved
- Updated `apps/orders-client/.env.example` with:
  - `VITE_APP_NAME=orders-client`
  - `VITE_APP_SECRET=orders-client-secret`

## Nginx Verification
- `apps/orders-client/nginx.conf` already has `location /api/v1/auth/` proxying to `users-service`, which covers:
  - `/api/v1/auth/guests`
  - `/api/v1/auth/applications/token`
- No nginx change required.

## Files Added
- `apps/orders-client/src/features/auth/appToken.ts`
- `apps/orders-client/src/features/auth/appToken.test.ts`
