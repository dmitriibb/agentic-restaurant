const DEFAULT_USERS_SERVICE_URL = "http://localhost:8081";
const DEFAULT_MENU_SERVICE_URL = "http://localhost:8082";
const DEFAULT_ORDERS_SERVICE_URL = "http://localhost:8083";
const DEFAULT_APP_NAME = "orders-client";
const DEFAULT_APP_SECRET = "orders-client-secret";

export const serviceBaseUrls = {
  usersService: import.meta.env.VITE_USERS_SERVICE_BASE_URL ?? DEFAULT_USERS_SERVICE_URL,
  menuService: import.meta.env.VITE_MENU_SERVICE_BASE_URL ?? DEFAULT_MENU_SERVICE_URL,
  ordersService: import.meta.env.VITE_ORDERS_SERVICE_BASE_URL ?? DEFAULT_ORDERS_SERVICE_URL
} as const;

export const appAuthConfig = {
  appName: import.meta.env.VITE_APP_NAME ?? DEFAULT_APP_NAME,
  appSecret: import.meta.env.VITE_APP_SECRET ?? DEFAULT_APP_SECRET
} as const;
