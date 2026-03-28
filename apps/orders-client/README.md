# orders-client

React client for authentication, menu browsing, basket management, and order submission workflows.

## Environment

Create `.env` from `.env.example` when overriding local defaults.

## Local Run

1. Install frontend workspace dependencies from the repository root:
   - `npm install`
2. Start dev server:
   - `npm run dev:orders-client`
3. Run tests:
   - `npm run test --workspace orders-client`
4. Build for production:
   - `npm run build --workspace orders-client`

## Workspace Notes

- This app is part of the repository npm workspace declared in the root `package.json`.
- Install dependencies from the repository root, not from this folder.
- Shared UI packages are linked locally by the workspace manager during development.

Default dev URL: `http://localhost:5173`

## Implemented Flow

1. Login against `users-service`
2. Store token in session storage and reuse it for protected requests
3. Load menu from `menu-service`
4. Build basket with quantity controls
5. Submit order to `orders-service` and show returned order id
