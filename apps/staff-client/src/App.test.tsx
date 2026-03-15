import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload
  } as Response;
}

describe("Staff client flows", () => {
  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("shows staff login form when unauthenticated", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    render(<App />);

    expect(screen.getByLabelText("Login")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("completes staff login and loads production board", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "staff-jwt",
          tokenType: "Bearer",
          expiresInSeconds: 3600,
          user: { id: 2001, login: "staff1", displayName: "Staff One", clientType: "REGISTERED_USER" }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            OrderID: 9100,
            ExternalRequestID: "req-abc",
            UserID: 1001,
            UserDisplayName: "Demo User",
            Status: "QUEUED",
            TotalItemCount: 2,
            ReadyItemCount: 0,
            BlockedItemCount: 0,
            CreatedAt: "2026-03-14T13:47:40Z",
            UpdatedAt: "2026-03-14T13:47:40Z",
            ReadyAt: null,
            Version: 1
          }
        ])
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    fireEvent.change(screen.getByLabelText("Login"), { target: { value: "staff1" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await screen.findByTestId("auth-status");
    expect(screen.getByTestId("auth-status")).toHaveTextContent("Staff One");

    await screen.findByTestId("order-9100");
    expect(screen.getByTestId("order-9100")).toHaveTextContent("#9100");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/auth/login");
    expect(fetchMock.mock.calls[1][0]).toContain("/api/v1/production/orders");

    const boardRequest = fetchMock.mock.calls[1][1] as RequestInit;
    expect(boardRequest.headers).toMatchObject({ Authorization: "Bearer staff-jwt" });
  });

  it("displays order detail when order is clicked", async () => {
    sessionStorage.setItem(
      "staff-client-auth",
      JSON.stringify({ token: "stored-token", user: { id: 2001, login: "staff1", displayName: "Staff One" } })
    );

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            OrderID: 9100,
            ExternalRequestID: "req-abc",
            UserID: 1001,
            UserDisplayName: "Demo User",
            Status: "QUEUED",
            TotalItemCount: 2,
            ReadyItemCount: 0,
            BlockedItemCount: 0,
            CreatedAt: "2026-03-14T13:47:40Z",
            UpdatedAt: "2026-03-14T13:47:40Z",
            ReadyAt: null,
            Version: 1
          }
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse({
          order: {
            OrderID: 9100,
            ExternalRequestID: "req-abc",
            UserID: 1001,
            UserDisplayName: "Demo User",
            Status: "QUEUED",
            TotalItemCount: 2,
            ReadyItemCount: 0,
            BlockedItemCount: 0,
            CreatedAt: "2026-03-14T13:47:40Z",
            UpdatedAt: "2026-03-14T13:47:40Z",
            ReadyAt: null,
            Version: 1
          },
          items: [
            {
              ID: "item-1",
              OrderID: 9100,
              LineNumber: 1,
              UnitSequence: 1,
              SourceItemKey: "9100-1-1",
              MenuItemID: 55,
              MenuItemName: "Margherita Pizza",
              StationKey: "kitchen",
              Status: "QUEUED",
              ClaimedByUserID: null,
              ClaimedByDisplayName: null,
              BlockedReason: null,
              CreatedAt: "2026-03-14T13:47:40Z",
              UpdatedAt: "2026-03-14T13:47:40Z",
              ClaimedAt: null,
              ReadyAt: null,
              Version: 1
            }
          ]
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByTestId("order-9100");
    fireEvent.click(screen.getByTestId("order-9100"));

    await screen.findByTestId("item-item-1");
    expect(screen.getByTestId("item-item-1")).toHaveTextContent("Margherita Pizza");
    expect(screen.getByTestId("item-item-1")).toHaveTextContent("L1U1");
    expect(screen.getByTestId("item-item-1")).toHaveTextContent("QUEUED");
  });

  it("sends pickup command and refreshes board", async () => {
    sessionStorage.setItem(
      "staff-client-auth",
      JSON.stringify({ token: "stored-token", user: { id: 2001, login: "staff1", displayName: "Staff One" } })
    );

    const fetchMock = vi.fn()
      // Initial board load
      .mockResolvedValueOnce(
        jsonResponse([
          {
            OrderID: 9100,
            ExternalRequestID: "req-abc",
            UserID: 1001,
            UserDisplayName: "Demo User",
            Status: "QUEUED",
            TotalItemCount: 1,
            ReadyItemCount: 0,
            BlockedItemCount: 0,
            CreatedAt: "2026-03-14T13:47:40Z",
            UpdatedAt: "2026-03-14T13:47:40Z",
            ReadyAt: null,
            Version: 1
          }
        ])
      )
      // Order detail load
      .mockResolvedValueOnce(
        jsonResponse({
          order: {
            OrderID: 9100,
            ExternalRequestID: "req-abc",
            UserID: 1001,
            UserDisplayName: "Demo User",
            Status: "QUEUED",
            TotalItemCount: 1,
            ReadyItemCount: 0,
            BlockedItemCount: 0,
            CreatedAt: "2026-03-14T13:47:40Z",
            UpdatedAt: "2026-03-14T13:47:40Z",
            ReadyAt: null,
            Version: 1
          },
          items: [
            {
              ID: "item-1",
              OrderID: 9100,
              LineNumber: 1,
              UnitSequence: 1,
              SourceItemKey: "9100-1-1",
              MenuItemID: 55,
              MenuItemName: "Margherita Pizza",
              StationKey: "kitchen",
              Status: "QUEUED",
              ClaimedByUserID: null,
              ClaimedByDisplayName: null,
              BlockedReason: null,
              CreatedAt: "2026-03-14T13:47:40Z",
              UpdatedAt: "2026-03-14T13:47:40Z",
              ClaimedAt: null,
              ReadyAt: null,
              Version: 1
            }
          ]
        })
      )
      // Pickup command
      .mockResolvedValueOnce(
        jsonResponse({
          itemId: "item-1",
          orderId: 9100,
          status: "IN_PROGRESS",
          command: "pickup",
          executedBy: "Staff One"
        })
      )
      // Detail reload after command
      .mockResolvedValueOnce(
        jsonResponse({
          order: {
            OrderID: 9100,
            ExternalRequestID: "req-abc",
            UserID: 1001,
            UserDisplayName: "Demo User",
            Status: "IN_PROGRESS",
            TotalItemCount: 1,
            ReadyItemCount: 0,
            BlockedItemCount: 0,
            CreatedAt: "2026-03-14T13:47:40Z",
            UpdatedAt: "2026-03-14T13:47:40Z",
            ReadyAt: null,
            Version: 2
          },
          items: [
            {
              ID: "item-1",
              OrderID: 9100,
              LineNumber: 1,
              UnitSequence: 1,
              SourceItemKey: "9100-1-1",
              MenuItemID: 55,
              MenuItemName: "Margherita Pizza",
              StationKey: "kitchen",
              Status: "IN_PROGRESS",
              ClaimedByUserID: 2001,
              ClaimedByDisplayName: "Staff One",
              BlockedReason: null,
              CreatedAt: "2026-03-14T13:47:40Z",
              UpdatedAt: "2026-03-14T13:47:40Z",
              ClaimedAt: "2026-03-14T13:48:00Z",
              ReadyAt: null,
              Version: 2
            }
          ]
        })
      )
      // Board reload after command
      .mockResolvedValueOnce(
        jsonResponse([
          {
            OrderID: 9100,
            ExternalRequestID: "req-abc",
            UserID: 1001,
            UserDisplayName: "Demo User",
            Status: "IN_PROGRESS",
            TotalItemCount: 1,
            ReadyItemCount: 0,
            BlockedItemCount: 0,
            CreatedAt: "2026-03-14T13:47:40Z",
            UpdatedAt: "2026-03-14T13:47:40Z",
            ReadyAt: null,
            Version: 2
          }
        ])
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    // Wait for board to load
    await screen.findByTestId("order-9100");

    // Click order to load detail
    fireEvent.click(screen.getByTestId("order-9100"));
    await screen.findByTestId("item-item-1");

    // Click pickup button
    fireEvent.click(screen.getByTestId("pickup-item-1"));

    // Wait for the command call and subsequent refreshes
    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(5);
    });

    // Verify the pickup POST was called correctly
    const pickupCall = fetchMock.mock.calls[2];
    expect(pickupCall[0]).toContain("/api/v1/production/items/item-1/pickup");
    expect((pickupCall[1] as RequestInit).method).toBe("POST");
    expect((pickupCall[1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer stored-token"
    });
  });

  it("sends ready command and refreshes order to READY", async () => {
    sessionStorage.setItem(
      "staff-client-auth",
      JSON.stringify({ token: "stored-token", user: { id: 2001, login: "staff1", displayName: "Staff One" } })
    );

    const fetchMock = vi.fn()
      // Initial board load
      .mockResolvedValueOnce(
        jsonResponse([
          {
            OrderID: 9100,
            ExternalRequestID: "req-abc",
            UserID: 1001,
            UserDisplayName: "Demo User",
            Status: "IN_PROGRESS",
            TotalItemCount: 1,
            ReadyItemCount: 0,
            BlockedItemCount: 0,
            CreatedAt: "2026-03-14T13:47:40Z",
            UpdatedAt: "2026-03-14T13:47:40Z",
            ReadyAt: null,
            Version: 2
          }
        ])
      )
      // Order detail load
      .mockResolvedValueOnce(
        jsonResponse({
          order: {
            OrderID: 9100,
            ExternalRequestID: "req-abc",
            UserID: 1001,
            UserDisplayName: "Demo User",
            Status: "IN_PROGRESS",
            TotalItemCount: 1,
            ReadyItemCount: 0,
            BlockedItemCount: 0,
            CreatedAt: "2026-03-14T13:47:40Z",
            UpdatedAt: "2026-03-14T13:47:40Z",
            ReadyAt: null,
            Version: 2
          },
          items: [
            {
              ID: "item-1",
              OrderID: 9100,
              LineNumber: 1,
              UnitSequence: 1,
              SourceItemKey: "9100-1-1",
              MenuItemID: 55,
              MenuItemName: "Margherita Pizza",
              StationKey: "kitchen",
              Status: "IN_PROGRESS",
              ClaimedByUserID: 2001,
              ClaimedByDisplayName: "Staff One",
              BlockedReason: null,
              CreatedAt: "2026-03-14T13:47:40Z",
              UpdatedAt: "2026-03-14T13:47:40Z",
              ClaimedAt: "2026-03-14T13:48:00Z",
              ReadyAt: null,
              Version: 2
            }
          ]
        })
      )
      // Ready command
      .mockResolvedValueOnce(
        jsonResponse({
          itemId: "item-1",
          orderId: 9100,
          status: "READY",
          command: "ready",
          executedBy: "Staff One"
        })
      )
      // Detail reload after command
      .mockResolvedValueOnce(
        jsonResponse({
          order: {
            OrderID: 9100,
            ExternalRequestID: "req-abc",
            UserID: 1001,
            UserDisplayName: "Demo User",
            Status: "READY",
            TotalItemCount: 1,
            ReadyItemCount: 1,
            BlockedItemCount: 0,
            CreatedAt: "2026-03-14T13:47:40Z",
            UpdatedAt: "2026-03-14T13:49:00Z",
            ReadyAt: "2026-03-14T13:49:00Z",
            Version: 3
          },
          items: [
            {
              ID: "item-1",
              OrderID: 9100,
              LineNumber: 1,
              UnitSequence: 1,
              SourceItemKey: "9100-1-1",
              MenuItemID: 55,
              MenuItemName: "Margherita Pizza",
              StationKey: "kitchen",
              Status: "READY",
              ClaimedByUserID: 2001,
              ClaimedByDisplayName: "Staff One",
              BlockedReason: null,
              CreatedAt: "2026-03-14T13:47:40Z",
              UpdatedAt: "2026-03-14T13:49:00Z",
              ClaimedAt: "2026-03-14T13:48:00Z",
              ReadyAt: "2026-03-14T13:49:00Z",
              Version: 3
            }
          ]
        })
      )
      // Board reload after command
      .mockResolvedValueOnce(
        jsonResponse([
          {
            OrderID: 9100,
            ExternalRequestID: "req-abc",
            UserID: 1001,
            UserDisplayName: "Demo User",
            Status: "READY",
            TotalItemCount: 1,
            ReadyItemCount: 1,
            BlockedItemCount: 0,
            CreatedAt: "2026-03-14T13:47:40Z",
            UpdatedAt: "2026-03-14T13:49:00Z",
            ReadyAt: "2026-03-14T13:49:00Z",
            Version: 3
          }
        ])
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByTestId("order-9100");
    fireEvent.click(screen.getByTestId("order-9100"));
    await screen.findByTestId("item-item-1");
    fireEvent.click(screen.getByTestId("ready-item-1"));

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(5);
    });

    const readyCall = fetchMock.mock.calls[2];
    expect(readyCall[0]).toContain("/api/v1/production/items/item-1/ready");
    expect((readyCall[1] as RequestInit).method).toBe("POST");
    expect((readyCall[1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer stored-token"
    });
  });

  it("restores session from storage", async () => {
    sessionStorage.setItem(
      "staff-client-auth",
      JSON.stringify({ token: "stored-token", user: { id: 42, login: "stored-user", displayName: "Stored User" } })
    );

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(screen.getByTestId("auth-status")).toHaveTextContent("Stored User");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const boardRequest = fetchMock.mock.calls[0][1] as RequestInit;
    expect(boardRequest.headers).toMatchObject({ Authorization: "Bearer stored-token" });
  });

  it("logout clears session and shows login form", async () => {
    sessionStorage.setItem(
      "staff-client-auth",
      JSON.stringify({ token: "stored-token", user: { id: 42, login: "stored-user", displayName: "Stored User" } })
    );

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(screen.getByTestId("auth-status")).toHaveTextContent("Stored User");

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(screen.getByLabelText("Login")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(sessionStorage.getItem("staff-client-auth")).toBeNull();
  });
});
