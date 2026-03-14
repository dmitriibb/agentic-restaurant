import { appAuthConfig } from "../../shared/api/config";
import { acquireAppToken } from "./api";

const REFRESH_FACTOR = 0.8;
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const TOKEN_EXPIRY_BUFFER_MS = 1000;

let appToken = "";
let appTokenExpiresAt = 0;
let inFlightTokenRequest: Promise<string> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function hasValidToken(): boolean {
  return Boolean(appToken) && Date.now() + TOKEN_EXPIRY_BUFFER_MS < appTokenExpiresAt;
}

function clearRefreshTimer(): void {
  if (!refreshTimer) {
    return;
  }
  clearTimeout(refreshTimer);
  refreshTimer = null;
}

function scheduleRefresh(expiresInSeconds: number): void {
  clearRefreshTimer();
  const refreshDelayMs = Math.max(1000, Math.floor(expiresInSeconds * 1000 * REFRESH_FACTOR));
  refreshTimer = setTimeout(() => {
    void refreshToken();
  }, refreshDelayMs);
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestTokenWithRetry(): Promise<string> {
  let retryDelayMs = INITIAL_RETRY_DELAY_MS;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await acquireAppToken(appAuthConfig.appName, appAuthConfig.appSecret);
      appToken = response.accessToken;
      appTokenExpiresAt = Date.now() + response.expiresInSeconds * 1000;
      scheduleRefresh(response.expiresInSeconds);
      return appToken;
    } catch (error) {
      console.error(`App token acquisition failed (attempt ${attempt}/${MAX_RETRIES}).`, error);
      if (attempt === MAX_RETRIES) {
        throw error instanceof Error ? error : new Error("App token acquisition failed.");
      }
      await delay(retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_DELAY_MS);
    }
  }

  throw new Error("App token acquisition failed.");
}

async function refreshToken(): Promise<void> {
  try {
    await forceTokenRefresh();
  } catch (error) {
    console.error("App token refresh failed. Will retry in the background.", error);
    clearRefreshTimer();
    refreshTimer = setTimeout(() => {
      void refreshToken();
    }, INITIAL_RETRY_DELAY_MS);
  }
}

async function forceTokenRefresh(): Promise<string> {
  if (inFlightTokenRequest) {
    return inFlightTokenRequest;
  }

  inFlightTokenRequest = requestTokenWithRetry().finally(() => {
    inFlightTokenRequest = null;
  });

  return inFlightTokenRequest;
}

export async function getAppToken(): Promise<string> {
  if (hasValidToken()) {
    return appToken;
  }
  return forceTokenRefresh();
}
