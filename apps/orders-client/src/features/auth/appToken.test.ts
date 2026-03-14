import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  acquireAppToken: vi.fn()
}));

describe("app token management", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.resetModules();
    vi.useRealTimers();
  });

  it("deduplicates concurrent token acquisition requests", async () => {
    const { acquireAppToken } = await import("./api");
    vi.mocked(acquireAppToken).mockResolvedValue({
      accessToken: "token-1",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
      user: { id: 9001, login: "app-orders-client-1", clientType: "APPLICATION" }
    });

    const appTokenModule = await import("./appToken");
    const [tokenA, tokenB] = await Promise.all([appTokenModule.getAppToken(), appTokenModule.getAppToken()]);

    expect(tokenA).toBe("token-1");
    expect(tokenB).toBe("token-1");
    expect(acquireAppToken).toHaveBeenCalledTimes(1);
  });

  it("refreshes token before expiration", async () => {
    vi.useFakeTimers();

    const { acquireAppToken } = await import("./api");
    vi.mocked(acquireAppToken)
      .mockResolvedValueOnce({
        accessToken: "token-1",
        tokenType: "Bearer",
        expiresInSeconds: 10,
        user: { id: 9001, login: "app-orders-client-1", clientType: "APPLICATION" }
      })
      .mockResolvedValueOnce({
        accessToken: "token-2",
        tokenType: "Bearer",
        expiresInSeconds: 10,
        user: { id: 9001, login: "app-orders-client-1", clientType: "APPLICATION" }
      });

    const appTokenModule = await import("./appToken");
    const firstToken = await appTokenModule.getAppToken();
    expect(firstToken).toBe("token-1");

    await vi.advanceTimersByTimeAsync(8000);

    expect(acquireAppToken).toHaveBeenCalledTimes(2);
  });
});
