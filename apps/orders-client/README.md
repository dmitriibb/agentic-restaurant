# orders-client

React client for authentication, menu browsing, basket management, and order submission workflows.

## Environment

Create `.env` from `.env.example` when overriding local defaults.

## Local Run

1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`
3. Run tests:
   - `npm test`
4. Build for production:
   - `npm run build`

Default dev URL: `http://localhost:5173`

## Implemented Flow

1. Login against `users-service`
2. Store token in session storage and reuse it for protected requests
3. Load menu from `menu-service`
4. Build basket with quantity controls
5. Submit order to `orders-service` and show returned order id
