import { serviceBaseUrls } from "../../shared/api/config";

export type UserSummary = {
  id: number;
  login: string;
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
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ login: loginValue, password })
  });

  if (!response.ok) {
    throw new Error("Login failed. Check credentials and try again.");
  }

  return (await response.json()) as LoginResponse;
}
