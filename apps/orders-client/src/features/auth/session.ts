import type { UserSummary } from "./api";

export type SessionAuth = {
  token: string;
  user: UserSummary;
};

export const AUTH_STORAGE_KEY = "orders-client-auth";

export function readAuthSession(): SessionAuth | null {
  const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionAuth;
    if (!parsed.token || !parsed.user?.id) {
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
