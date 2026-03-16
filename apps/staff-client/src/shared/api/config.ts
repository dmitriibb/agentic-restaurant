const DEFAULT_USERS_SERVICE_URL = "http://localhost:8081";
const DEFAULT_PRODUCTION_SERVICE_URL = "http://localhost:8084";
const DEFAULT_DISPLAY_APP_NAME = "staff-client-display";
const DEFAULT_DISPLAY_APP_SECRET = "staff-client-display-secret";

export const serviceBaseUrls = {
  usersService: import.meta.env.VITE_USERS_SERVICE_BASE_URL ?? DEFAULT_USERS_SERVICE_URL,
  productionService: import.meta.env.VITE_PRODUCTION_SERVICE_BASE_URL ?? DEFAULT_PRODUCTION_SERVICE_URL
} as const;

export const displayAppAuthConfig = {
  appName: import.meta.env.VITE_DISPLAY_APP_NAME ?? DEFAULT_DISPLAY_APP_NAME,
  appSecret: import.meta.env.VITE_DISPLAY_APP_SECRET ?? DEFAULT_DISPLAY_APP_SECRET,
} as const;
