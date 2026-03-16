import type { UserSummary } from "./api";

export type UiMode = "interactive" | "display";

export type UiSession = {
  mode: UiMode;
  authKind: "user" | "application";
  accessToken: string;
  user?: UserSummary;
};

export const AUTH_STORAGE_KEY = "staff-client-auth";

type PersistedInteractiveSession = {
  mode: "interactive";
  token: string;
  user: UserSummary;
};

type PersistedDisplaySession = {
  mode: "display";
};

type PersistedSession = PersistedInteractiveSession | PersistedDisplaySession;

export function readPersistedSession(): PersistedSession | null {
  const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    if (parsed.mode === "interactive") {
      if (!parsed.token || !parsed.user?.id || !parsed.user?.login) return null;
      return parsed;
    }
    if (parsed.mode === "display") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeInteractiveSession(token: string, user: UserSummary): void {
  const data: PersistedInteractiveSession = { mode: "interactive", token, user };
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

export function writeDisplaySession(): void {
  const data: PersistedDisplaySession = { mode: "display" };
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

export function clearSession(): void {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}
