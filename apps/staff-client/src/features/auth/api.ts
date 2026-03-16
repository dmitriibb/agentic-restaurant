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

export type AppTokenResponse = {
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

export async function acquireAppToken(
  name: string,
  secret: string
): Promise<AppTokenResponse> {
  const response = await fetch(
    `${serviceBaseUrls.usersService}/api/v1/auth/applications/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationName: name, applicationSecret: secret }),
    }
  );

  if (!response.ok) {
    throw new Error("Application token acquisition failed.");
  }

  return (await response.json()) as AppTokenResponse;
}
