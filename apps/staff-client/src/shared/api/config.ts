const DEFAULT_USERS_SERVICE_URL = "http://localhost:8081";
const DEFAULT_PRODUCTION_SERVICE_URL = "http://localhost:8084";

export const serviceBaseUrls = {
  usersService: import.meta.env.VITE_USERS_SERVICE_BASE_URL ?? DEFAULT_USERS_SERVICE_URL,
  productionService: import.meta.env.VITE_PRODUCTION_SERVICE_BASE_URL ?? DEFAULT_PRODUCTION_SERVICE_URL
} as const;
