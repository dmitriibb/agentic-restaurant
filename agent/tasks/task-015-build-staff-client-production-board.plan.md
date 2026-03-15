# Implementation Plan

## Task Summary

Create `apps/staff-client` as a standalone React application that allows staff users to sign in, view the live production board, and send item lifecycle commands (pickup, block, resume, ready) to `production-service`. The app must follow the existing frontend conventions from `apps/orders-client`.

## Architecture Input

- `source_architecture`: `task-010-order-production-pipeline-architecture`
- Archived architecture reference: `agent/done/task-010-order-production-pipeline-architecture/task-010-order-production-pipeline-architecture.arch.md`

## Affected Areas

- `apps/staff-client/` (new app, all files)
- `docker-compose.yml` (add staff-client service)
- `flow-index.yaml` (already lists `apps/staff-client` in `user_authentication` and `order_production` flows)
- `domain-brain/flows/user-authentication.md` (already references staff-client)
- No domain-brain changes expected since docs already cover staff-client

## Production-Service API Contract Reference

The coder must target these exact endpoints and response shapes:

### List orders: `GET /api/v1/production/orders?status={status}&limit={limit}`

Response: JSON array of `ProductionOrder` objects. **Go struct has no JSON tags**, so fields serialize as PascalCase:

```json
[
  {
    "OrderID": 9100,
    "ExternalRequestID": "0d163888-...",
    "UserID": 1001,
    "UserDisplayName": "Demo User",
    "Status": "QUEUED",
    "TotalItemCount": 4,
    "ReadyItemCount": 0,
    "BlockedItemCount": 0,
    "CreatedAt": "2026-03-14T13:47:40Z",
    "UpdatedAt": "2026-03-14T13:47:40Z",
    "ReadyAt": null,
    "Version": 1
  }
]
```

### Get order detail: `GET /api/v1/production/orders/{orderId}`

Response: `{ "order": ProductionOrder, "items": ProductionItem[] }`

ProductionItem fields (PascalCase, no JSON tags):

```json
{
  "ID": "01HZY7...",
  "OrderID": 9100,
  "LineNumber": 1,
  "UnitSequence": 1,
  "SourceItemKey": "9100-1-1",
  "MenuItemID": 55,
  "MenuItemName": "Margherita Pizza",
  "StationKey": "kitchen",
  "Status": "QUEUED",
  "ClaimedByUserID": null,
  "ClaimedByDisplayName": null,
  "BlockedReason": null,
  "CreatedAt": "2026-03-14T13:47:40Z",
  "UpdatedAt": "2026-03-14T13:47:40Z",
  "ClaimedAt": null,
  "ReadyAt": null,
  "Version": 1
}
```

### Item commands: `POST /api/v1/production/items/{itemId}/{command}`

Where `{command}` is one of: `pickup`, `block`, `resume`, `ready`.

Request body (optional): `{ "expectedVersion": 3, "reason": "ingredient missing" }`

Success response (200):

```json
{
  "itemId": "01HZY7...",
  "orderId": 9100,
  "status": "IN_PROGRESS",
  "command": "pickup",
  "executedBy": "Staff One"
}
```

Error responses: `409 Conflict` for invalid transitions or version conflicts, `404 Not Found` for missing item, `401/403` for auth failures.

### Auth: `POST /api/v1/auth/login`

Same endpoint as orders-client. Request: `{ "login": "...", "password": "..." }`. Response: `{ "accessToken": "...", "tokenType": "Bearer", "expiresInSeconds": 3600, "user": { "id": ..., "login": "...", "displayName": "...", "clientType": "REGISTERED_USER" } }`.

## Steps

### Step 1: Scaffold `apps/staff-client` project structure

Create the following directory structure mirroring `apps/orders-client` conventions:

```
apps/staff-client/
  .dockerignore
  .env.example
  Dockerfile
  index.html
  nginx.conf
  package.json
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    App.test.tsx
    vite-env.d.ts
    styles.css
    test/
      setup.ts
    shared/
      api/
        config.ts
    features/
      auth/
        api.ts
        session.ts
      production/
        api.ts
        types.ts
```

### Step 2: Create `apps/staff-client/package.json`

```json
{
  "name": "staff-client",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.10.1",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

Same dependencies as orders-client. Identical version pins for consistency.

### Step 3: Create TypeScript config files

**`tsconfig.json`** - identical structure to orders-client:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

**`tsconfig.app.json`** - identical to orders-client:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

**`tsconfig.node.json`** - identical to orders-client:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

### Step 4: Create `vite.config.ts`

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true
  }
});
```

### Step 5: Create `src/test/setup.ts`

```ts
import "@testing-library/jest-dom/vitest";
```

### Step 6: Create `src/vite-env.d.ts`

```ts
/// <reference types="vite/client" />
```

### Step 7: Create `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Staff Client</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 8: Create `src/shared/api/config.ts`

```ts
const DEFAULT_USERS_SERVICE_URL = "http://localhost:8081";
const DEFAULT_PRODUCTION_SERVICE_URL = "http://localhost:8084";

export const serviceBaseUrls = {
  usersService: import.meta.env.VITE_USERS_SERVICE_BASE_URL ?? DEFAULT_USERS_SERVICE_URL,
  productionService: import.meta.env.VITE_PRODUCTION_SERVICE_BASE_URL ?? DEFAULT_PRODUCTION_SERVICE_URL
} as const;
```

Note: staff-client only needs `users-service` (for login) and `production-service` (for board data). No menu-service or orders-service needed.

### Step 9: Create `.env.example`

```
VITE_USERS_SERVICE_BASE_URL=http://localhost:8081
VITE_PRODUCTION_SERVICE_BASE_URL=http://localhost:8084
```

### Step 10: Create `src/features/auth/api.ts`

Reuse the same auth types and login function pattern from orders-client, adapted for staff-client (no guest flow, no app token):

```ts
import { serviceBaseUrls } from "../../shared/api/config";

export type UserSummary = {
  id: number;
  login: string;
  displayName?: string;
  clientType?: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserSummary;
};

export async function login(loginValue: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${serviceBaseUrls.usersService}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: loginValue, password })
  });

  if (!response.ok) {
    throw new Error("Login failed. Check credentials and try again.");
  }

  return (await response.json()) as LoginResponse;
}
```

No guest login or app token needed. Staff uses registered login only.

### Step 11: Create `src/features/auth/session.ts`

```ts
import type { UserSummary } from "./api";

export type SessionAuth = {
  token: string;
  user: UserSummary;
};

export const AUTH_STORAGE_KEY = "staff-client-auth";

export function readAuthSession(): SessionAuth | null {
  const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SessionAuth;
    if (!parsed.token || !parsed.user?.id || !parsed.user?.login) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: SessionAuth | null): void {
  if (!session) {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}
```

Uses `"staff-client-auth"` as storage key to avoid collision with orders-client.

### Step 12: Create `src/features/production/types.ts`

Define TypeScript types matching the exact PascalCase JSON shape from production-service Go structs (no JSON tags = PascalCase serialization):

```ts
export type ProductionOrder = {
  OrderID: number;
  ExternalRequestID: string;
  UserID: number;
  UserDisplayName: string | null;
  Status: string;
  TotalItemCount: number;
  ReadyItemCount: number;
  BlockedItemCount: number;
  CreatedAt: string;
  UpdatedAt: string;
  ReadyAt: string | null;
  Version: number;
};

export type ProductionItem = {
  ID: string;
  OrderID: number;
  LineNumber: number;
  UnitSequence: number;
  SourceItemKey: string;
  MenuItemID: number;
  MenuItemName: string;
  StationKey: string;
  Status: string;
  ClaimedByUserID: number | null;
  ClaimedByDisplayName: string | null;
  BlockedReason: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  ClaimedAt: string | null;
  ReadyAt: string | null;
  Version: number;
};

export type OrderDetail = {
  order: ProductionOrder;
  items: ProductionItem[];
};

export type CommandResponse = {
  itemId: string;
  orderId: number;
  status: string;
  command: string;
  executedBy: string;
};

export type ItemCommand = "pickup" | "block" | "resume" | "ready";

export const STATUS_QUEUED = "QUEUED";
export const STATUS_IN_PROGRESS = "IN_PROGRESS";
export const STATUS_BLOCKED = "BLOCKED";
export const STATUS_READY = "READY";
export const STATUS_CANCELLED = "CANCELLED";
```

### Step 13: Create `src/features/production/api.ts`

```ts
import { serviceBaseUrls } from "../../shared/api/config";
import type { ProductionOrder, OrderDetail, CommandResponse, ItemCommand } from "./types";

export async function fetchOrders(token: string, status?: string): Promise<ProductionOrder[]> {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  params.set("limit", "200");

  const response = await fetch(
    `${serviceBaseUrls.productionService}/api/v1/production/orders?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load production orders.");
  }

  return (await response.json()) as ProductionOrder[];
}

export async function fetchOrderDetail(token: string, orderId: number): Promise<OrderDetail> {
  const response = await fetch(
    `${serviceBaseUrls.productionService}/api/v1/production/orders/${orderId}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load order detail.");
  }

  return (await response.json()) as OrderDetail;
}

export async function sendItemCommand(
  token: string,
  itemId: string,
  command: ItemCommand,
  options?: { expectedVersion?: number; reason?: string }
): Promise<CommandResponse> {
  const body: Record<string, unknown> = {};
  if (options?.expectedVersion !== undefined) {
    body.expectedVersion = options.expectedVersion;
  }
  if (options?.reason) {
    body.reason = options.reason;
  }

  const response = await fetch(
    `${serviceBaseUrls.productionService}/api/v1/production/items/${itemId}/${command}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    }
  );

  if (response.status === 409) {
    const error = await response.json();
    throw new Error(error.error ?? "Conflict: item was modified or transition is invalid.");
  }

  if (response.status === 404) {
    throw new Error("Item not found.");
  }

  if (!response.ok) {
    throw new Error("Command failed.");
  }

  return (await response.json()) as CommandResponse;
}
```

### Step 14: Create `src/main.tsx`

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

### Step 15: Create `src/App.tsx`

The main application component with two states:

1. **Not authenticated**: Show staff login form (registered login only, no guest flow).
2. **Authenticated**: Show production board with order list grouped by status, order detail, and item action buttons.

Detailed component behavior:

```tsx
import { useEffect, useState, type FormEvent } from "react";
import { login, type UserSummary } from "./features/auth/api";
import { readAuthSession, writeAuthSession } from "./features/auth/session";
import {
  fetchOrders,
  fetchOrderDetail,
  sendItemCommand,
} from "./features/production/api";
import type {
  ProductionOrder,
  ProductionItem,
  OrderDetail,
  ItemCommand,
} from "./features/production/types";
import {
  STATUS_QUEUED,
  STATUS_IN_PROGRESS,
  STATUS_BLOCKED,
  STATUS_READY,
} from "./features/production/types";
import { serviceBaseUrls } from "./shared/api/config";

const POLL_INTERVAL_MS = 5000;

export function App() {
  // Auth state
  const existingSession = readAuthSession();
  const [token, setToken] = useState<string>(existingSession?.token ?? "");
  const [user, setUser] = useState<UserSummary | null>(existingSession?.user ?? null);
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Board state
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  // Detail state
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Command state
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);

  const isAuthenticated = Boolean(token && user);

  // Login handler
  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const response = await login(loginValue, password);
      setToken(response.accessToken);
      setUser(response.user);
      writeAuthSession({ token: response.accessToken, user: response.user });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  // Logout
  function logout() {
    setToken("");
    setUser(null);
    setOrders([]);
    setSelectedOrderId(null);
    setOrderDetail(null);
    writeAuthSession(null);
  }

  // Load board
  async function loadBoard() {
    if (!token) return;
    setBoardLoading(true);
    setBoardError(null);
    try {
      const data = await fetchOrders(token);
      setOrders(data);
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : "Failed to load board.");
    } finally {
      setBoardLoading(false);
    }
  }

  // Load order detail
  async function loadDetail(orderId: number) {
    if (!token) return;
    setSelectedOrderId(orderId);
    setDetailLoading(true);
    setDetailError(null);
    setCommandError(null);
    try {
      const data = await fetchOrderDetail(token, orderId);
      setOrderDetail(data);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Failed to load order.");
    } finally {
      setDetailLoading(false);
    }
  }

  // Send item command
  async function onItemCommand(itemId: string, command: ItemCommand, reason?: string) {
    if (!token || !selectedOrderId) return;
    setCommandLoading(itemId);
    setCommandError(null);
    try {
      await sendItemCommand(token, itemId, command, { reason });
      // Reload detail and board after successful command
      await loadDetail(selectedOrderId);
      await loadBoard();
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : "Command failed.");
    } finally {
      setCommandLoading(null);
    }
  }

  // Auto-load board on auth and poll
  useEffect(() => {
    if (!isAuthenticated) return;
    void loadBoard();
    const interval = setInterval(() => { void loadBoard(); }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  // Helper: group orders by status
  function ordersByStatus(status: string): ProductionOrder[] {
    return orders.filter((o) => o.Status === status);
  }

  // Helper: get allowed actions for an item
  function getAllowedActions(item: ProductionItem): ItemCommand[] {
    switch (item.Status) {
      case STATUS_QUEUED: return ["pickup", "block"];
      case STATUS_IN_PROGRESS: return ["ready", "block"];
      case STATUS_BLOCKED: return ["resume"];
      default: return [];
    }
  }

  // Render ...
  // (see JSX structure below)
}
```

**JSX structure**:

- `<header>`: "Staff Client" title + "Production Board" subtitle + Refresh/Logout buttons
- `<main className="board-layout">`:
  - **Left panel: Order list** grouped into status sections (QUEUED, IN_PROGRESS, BLOCKED, READY). Each order card shows: order ID, customer name, status, item counts (ready/total), created time. Clicking an order calls `loadDetail(orderId)`.
  - **Right panel: Order detail** (shown when an order is selected). Shows order header and a list of items. Each item shows: menu item name, `L{lineNumber}U{unitSequence}`, status badge, claimed-by, blocked-reason if present. Each item has action buttons based on `getAllowedActions()`.
- `<footer>`: Service URLs (users-service, production-service)

The coder must implement the full JSX. Keep the component in a single `App.tsx` file (same as orders-client pattern). If the App component becomes too large, the coder may extract sub-components into `src/features/production/` but the main entry point remains `App.tsx`.

### Step 16: Create `src/styles.css`

Adapt from orders-client styles. Use the same CSS custom properties and general patterns. Add specific classes for the production board layout:

- `.board-layout` - two-column grid (order list on left, detail on right)
- `.status-section` - grouped section for each status
- `.order-card` - clickable order card in the list
- `.order-card.selected` - highlighted selected card
- `.item-row` - row for each production item in detail view
- `.status-badge` - inline status label with color coding by status
- `.status-badge.queued` / `.status-badge.in-progress` / `.status-badge.blocked` / `.status-badge.ready`
- Responsive breakpoints: collapse to single column below 900px (tablet), below 700px (mobile)

Key decisions:
- Reuse the same color tokens as orders-client (`--accent`, `--surface`, `--line`, `--text`, `--muted`, etc.)
- Status colors: QUEUED=neutral/gray, IN_PROGRESS=blue, BLOCKED=amber/red, READY=green

### Step 17: Create Docker and nginx configuration

**`Dockerfile`** - identical pattern to orders-client:

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV VITE_USERS_SERVICE_BASE_URL=""
ENV VITE_PRODUCTION_SERVICE_BASE_URL=""
RUN npm run build

# Runtime stage
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

**`nginx.conf`** - proxy to users-service and production-service:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location /api/v1/auth/ {
        proxy_pass         http://users-service:8081;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location /api/v1/production/ {
        proxy_pass         http://production-service:8084;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**`.dockerignore`** - identical to orders-client:

```
node_modules/
dist/
.idea/
*.iml
.git/
```

### Step 18: Add `staff-client` service to `docker-compose.yml`

Add after the `orders-client` service block:

```yaml
  staff-client:
    build:
      context: ./apps/staff-client
    container_name: restaurant-staff-client
    ports:
      - "8085:80"
    environment:
      VITE_APP_NAME: staff-client
    depends_on:
      users-service:
        condition: service_healthy
      production-service:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 64M
```

Use port `8085` to avoid conflicts with existing services (80=orders-client, 8081=users, 8082=menu, 8083=orders, 8084=production).

### Step 19: Run `npm install` in `apps/staff-client`

Execute `npm install` to generate `package-lock.json` and install `node_modules/`.

### Step 20: Create `src/App.test.tsx`

Comprehensive test suite using the same patterns as `apps/orders-client/src/App.test.tsx`. Tests should mock `fetch` and verify:

**Test 1: Shows staff login form when unauthenticated**
- Render App
- Assert login form fields (Login, Password) and Sign In button are present

**Test 2: Completes staff login and loads production board**
- Mock `fetch`:
  - Call 1: POST `/api/v1/auth/login` -> returns `{ accessToken: "staff-jwt", ..., user: { id: 2001, login: "staff1", displayName: "Staff One", clientType: "REGISTERED_USER" } }`
  - Call 2: GET `/api/v1/production/orders` -> returns `[{ OrderID: 9100, Status: "QUEUED", UserDisplayName: "Demo User", TotalItemCount: 2, ReadyItemCount: 0, ... }]`
- Fill login form, click Sign In
- Assert auth status shows "Staff One"
- Assert order #9100 appears on the board
- Verify fetch was called with correct auth headers

**Test 3: Displays order detail when order is clicked**
- Pre-authenticate via sessionStorage
- Mock `fetch`:
  - Call 1: GET `/api/v1/production/orders` -> returns orders
  - Call 2: GET `/api/v1/production/orders/9100` -> returns `{ order: {...}, items: [{ ID: "item-1", MenuItemName: "Margherita Pizza", Status: "QUEUED", ... }] }`
- Click order card
- Assert item details appear with menu item name and status

**Test 4: Sends pickup command and refreshes board**
- Pre-authenticate via sessionStorage
- Mock fetch sequence: board load -> order detail -> pickup command -> board reload -> detail reload
- Click pickup button on a QUEUED item
- Assert `POST /api/v1/production/items/item-1/pickup` was called with correct auth header
- Assert board refreshes after command

**Test 5: Restores session from storage**
- Set `staff-client-auth` in sessionStorage with stored token and user
- Render App
- Assert auth status shows the stored user
- Assert board load is triggered

**Test 6: Logout clears session**
- Pre-authenticate
- Click Logout button
- Assert login form reappears
- Assert sessionStorage is cleared

Test helpers:
- `function jsonResponse(payload: unknown): Response` - same pattern as orders-client

### Step 21: Verify build and tests pass

- Run `npm test` in `apps/staff-client` - all tests must pass
- Run `npm run build` in `apps/staff-client` - TypeScript compilation and Vite build must succeed

## Tests

### Unit tests (`apps/staff-client/src/App.test.tsx`)

1. Shows staff login form when unauthenticated
2. Completes staff login flow and loads production board
3. Displays order detail when an order card is clicked
4. Sends pickup command for a QUEUED item and refreshes the board
5. Restores previous auth session from sessionStorage
6. Logout clears session and shows login form

### Validation commands

- `npm test` in `apps/staff-client` must pass
- `npm run build` in `apps/staff-client` must pass

### Manual smoke test (informational, not automated)

- Start the full stack with `docker compose up --build`
- Open `http://localhost:8085`
- Log in with a staff account
- Verify production board loads
- Verify item commands work

## Domain Documentation Updates

### `domain-brain/` changes

No updates required. The following files already reference `staff-client`:
- `domain-brain/flows/user-authentication.md` (line 9: mentions `staff-client`)
- `domain-brain/flows/order-production.md` (step 6: mentions `staff-client`)
- `domain-brain/entities/production-order.md`, `domain-brain/entities/production-item.md` (document the data model)
- `domain-brain/invariants.md` (covers staff-facing endpoint auth requirements)
- `domain-brain/state-machines/production-item-lifecycle.md` (covers all transitions)

### `flow-index.yaml` changes

No updates required. `apps/staff-client` is already listed under both `user_authentication` and `order_production` flow paths.

## Open Questions

- The production-service Go structs (`ProductionOrder`, `ProductionItem`) currently lack JSON tags, so they serialize with PascalCase field names (e.g., `OrderID` instead of `orderId`). This is an existing API contract. The staff-client TypeScript types must use PascalCase to match. If production-service later adds `json:"camelCase"` tags, the staff-client types will need updating. This is not a blocker for this task.
- SSE endpoint (`GET /api/v1/production/stream`) is referenced in the architecture but does not appear to be implemented in `production-service` yet. This plan uses polling as the fallback strategy. SSE support can be added in a follow-up task when the endpoint exists. The `POLL_INTERVAL_MS` constant (5000ms) is adequate for the initial version.
