import { displayAppAuthConfig } from "../../shared/api/config";
import { acquireAppToken } from "./api";

const REFRESH_FACTOR = 0.8;
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const TOKEN_EXPIRY_BUFFER_MS = 1000;

let displayToken = "";
let displayTokenExpiresAt = 0;
let inFlightRequest: Promise<string> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function hasValidToken(): boolean {
  return Boolean(displayToken) && Date.now() + TOKEN_EXPIRY_BUFFER_MS < displayTokenExpiresAt;
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
      const response = await acquireAppToken(
        displayAppAuthConfig.appName,
        displayAppAuthConfig.appSecret
      );
      displayToken = response.accessToken;
      displayTokenExpiresAt = Date.now() + response.expiresInSeconds * 1000;
      scheduleRefresh(response.expiresInSeconds);
      return displayToken;
    } catch (error) {
      console.error(`Display token acquisition failed (attempt ${attempt}/${MAX_RETRIES}).`, error);
      if (attempt === MAX_RETRIES) {
        throw error instanceof Error ? error : new Error("Application token acquisition failed.");
      }
      await delay(retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_DELAY_MS);
    }
  }

  throw new Error("Application token acquisition failed.");
}

async function refreshToken(): Promise<void> {
  try {
    await forceTokenRefresh();
  } catch (error) {
    console.error("Display token refresh failed. Will retry in the background.", error);
    clearRefreshTimer();
    refreshTimer = setTimeout(() => {
      void refreshToken();
    }, INITIAL_RETRY_DELAY_MS);
  }
}

async function forceTokenRefresh(): Promise<string> {
  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = requestTokenWithRetry().finally(() => {
    inFlightRequest = null;
  });

  return inFlightRequest;
}

export async function getDisplayToken(): Promise<string> {
  if (hasValidToken()) {
    return displayToken;
  }
  return forceTokenRefresh();
}

export function clearDisplayToken(): void {
  displayToken = "";
  displayTokenExpiresAt = 0;
  inFlightRequest = null;
  clearRefreshTimer();
}
