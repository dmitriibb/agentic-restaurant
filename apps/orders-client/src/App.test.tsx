import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { getAppToken } from "./features/auth/appToken";

vi.mock("./features/auth/appToken", () => ({
  getAppToken: vi.fn().mockResolvedValue("app-token")
}));

describe("Orders client flows", () => {
  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("shows mode-gated landing actions before authentication", () => {
    vi.stubGlobal("fetch", vi.fn());

    render(<App />);

    expect(screen.getByRole("button", { name: "Login as Registered" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login as Guest" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Menu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Basket + Checkout" })).not.toBeInTheDocument();
  });

  it("completes registered login, menu load, basket updates, and order submission", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "jwt-token",
          tokenType: "Bearer",
          expiresInSeconds: 3600,
          user: { id: 1001, login: "demo-user", displayName: "Demo User", clientType: "REGISTERED_USER" }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: 1, name: "Pizza", description: "Tomato", price: 12.5 },
            { id: 2, name: "Cola", description: "Drink", price: 3 }
          ]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          orderId: 900001,
          requestId: "req-123",
          status: "ACCEPTED",
          totalAmount: 15.5,
          userDisplayName: "Demo User"
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Login as Registered" }));
    fireEvent.change(screen.getByLabelText("Login"), { target: { value: "demo-user" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await screen.findByText("Pizza");
    expect(screen.getByTestId("mode-chip")).toHaveTextContent("Mode: registered user");

    fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]);
    expect(screen.getByTestId("qty-1")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByTestId("qty-1")).toHaveTextContent("2");
    expect(screen.getByTestId("basket-total")).toHaveTextContent("$25.00");

    fireEvent.click(screen.getByRole("button", { name: "Submit Order" }));

    await screen.findByTestId("order-confirmation");
    expect(screen.getByTestId("order-confirmation")).toHaveTextContent("#900001");
    expect(screen.getByTestId("order-confirmation")).toHaveTextContent("Demo User");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/auth/login");
    expect(fetchMock.mock.calls[1][0]).toContain("/api/v1/menu-items");
    expect(fetchMock.mock.calls[2][0]).toContain("/api/v1/orders/");

    const menuRequest = fetchMock.mock.calls[1][1] as RequestInit;
    const orderRequest = fetchMock.mock.calls[2][1] as RequestInit;

    expect(menuRequest.headers).toMatchObject({ Authorization: "Bearer jwt-token" });
    expect(orderRequest.headers).toMatchObject({ Authorization: "Bearer jwt-token" });

    const orderBody = JSON.parse(String(orderRequest.body));
    expect(orderBody).toEqual({
      userId: 1001,
      items: [{ itemId: 1, quantity: 2 }]
    });
  });

  it("completes guest login flow, loads menu, and acquires app token lazily", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "guest-jwt",
          tokenType: "Bearer",
          expiresInSeconds: 86400,
          user: { id: 5001, login: "guest-abc", displayName: "Walk In", clientType: "GUEST_USER" }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: 1, name: "Pizza", description: "Tomato", price: 12.5 }]
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(vi.mocked(getAppToken)).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Login as Guest" }));
    expect(vi.mocked(getAppToken)).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Walk In" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Guest Session" }));

    await screen.findByText("Pizza");
    expect(screen.getByTestId("mode-chip")).toHaveTextContent("Mode: guest");
    expect(vi.mocked(getAppToken)).toHaveBeenCalledTimes(1);

    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/auth/guests");
    const guestRequest = fetchMock.mock.calls[0][1] as RequestInit;
    expect(guestRequest.headers).toMatchObject({ Authorization: "Bearer app-token" });
    expect(JSON.parse(String(guestRequest.body))).toEqual({ displayName: "Walk In" });

    const menuRequest = fetchMock.mock.calls[1][1] as RequestInit;
    expect(menuRequest.headers).toMatchObject({ Authorization: "Bearer guest-jwt" });
  });

  it("restores previous auth session from storage with mode metadata", async () => {
    sessionStorage.setItem(
      "orders-client-auth",
      JSON.stringify({
        token: "stored-token",
        mode: "registered",
        user: { id: 42, login: "stored-user", clientType: "REGISTERED_USER" }
      })
    );

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        items: []
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(screen.getByTestId("mode-chip")).toHaveTextContent("Mode: registered user");

    fireEvent.click(screen.getByRole("button", { name: "Reload Menu" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const menuRequest = fetchMock.mock.calls[0][1] as RequestInit;
    expect(menuRequest.headers).toMatchObject({ Authorization: "Bearer stored-token" });
  });
});

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload
  } as Response;
}
