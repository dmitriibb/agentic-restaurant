import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("Orders client flows", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("completes login, menu load, basket updates, and order submission", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "jwt-token",
          tokenType: "Bearer",
          expiresInSeconds: 3600,
          user: { id: 1001, login: "demo-user" }
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
          totalAmount: 15.5
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Login"), { target: { value: "demo-user" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await screen.findByTestId("auth-status");
    await screen.findByText("Pizza");

    fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]);
    expect(screen.getByTestId("qty-1")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByTestId("qty-1")).toHaveTextContent("2");
    expect(screen.getByTestId("basket-total")).toHaveTextContent("$25.00");

    fireEvent.click(screen.getByRole("button", { name: "Submit Order" }));

    await screen.findByTestId("order-confirmation");
    expect(screen.getByTestId("order-confirmation")).toHaveTextContent("#900001");

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

  it("restores previous auth session from storage", async () => {
    sessionStorage.setItem(
      "orders-client-auth",
      JSON.stringify({ token: "stored-token", user: { id: 42, login: "stored-user" } })
    );

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        items: []
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId("auth-status")).toHaveTextContent("stored-user");

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
