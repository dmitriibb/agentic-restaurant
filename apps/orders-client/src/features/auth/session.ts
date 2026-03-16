import type { ClientType, UserSummary } from "./api";

export type UiMode = "registered" | "guest";

export type SessionAuth = {
  token: string;
  mode: UiMode;
  user: UserSummary & { clientType?: ClientType };
};

export const AUTH_STORAGE_KEY = "orders-client-auth";

function normalizeMode(candidate: unknown, clientType?: ClientType): UiMode {
  if (candidate === "registered" || candidate === "guest") {
    return candidate;
  }

  if (clientType === "GUEST_USER") {
    return "guest";
  }

  return "registered";
}

export function readAuthSession(): SessionAuth | null {
  const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionAuth> & {
      user?: (UserSummary & { clientType?: ClientType }) | null;
      mode?: unknown;
    };

    if (!parsed.token || !parsed.user?.id || !parsed.user?.login) {
      return null;
    }

    return {
      token: parsed.token,
      user: parsed.user,
      mode: normalizeMode(parsed.mode, parsed.user.clientType)
    };
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
