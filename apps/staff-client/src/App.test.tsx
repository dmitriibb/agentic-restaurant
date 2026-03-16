import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

/* ── Mock the appToken module so display-mode tests don't hit real endpoints ── */
vi.mock("./features/auth/appToken", () => ({
  getDisplayToken: vi.fn(),
  clearDisplayToken: vi.fn(),
}));

import { getDisplayToken, clearDisplayToken } from "./features/auth/appToken";

const mockGetDisplayToken = getDisplayToken as ReturnType<typeof vi.fn>;
const mockClearDisplayToken = clearDisplayToken as ReturnType<typeof vi.fn>;

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as Response;
}

function failResponse(status = 401): Response {
  return {
    ok: false,
    status,
    json: async () => ({ error: "fail" }),
  } as Response;
}

const SAMPLE_ORDER = {
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
  Version: 1,
};

const SAMPLE_ITEM = {
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
  Version: 1,
};

const SAMPLE_DETAIL = {
  order: SAMPLE_ORDER,
  items: [SAMPLE_ITEM],
};

const STAFF_USER = { id: 2001, login: "staff1", displayName: "Staff One", clientType: "REGISTERED_USER" };

function setInteractiveSession(token = "stored-token", user = STAFF_USER) {
  sessionStorage.setItem("staff-client-auth", JSON.stringify({ mode: "interactive", token, user }));
}

function setDisplaySession() {
  sessionStorage.setItem("staff-client-auth", JSON.stringify({ mode: "display" }));
}

describe("Staff client — state machine flows", () => {
  beforeEach(() => {
    mockGetDisplayToken.mockReset();
    mockClearDisplayToken.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  // ── 7a: Landing screen ──

  it("shows landing screen with mode selection when no session exists", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    render(<App />);

    expect(screen.getByTestId("mode-selection")).toBeInTheDocument();
    expect(screen.getByTestId("mode-interactive")).toBeInTheDocument();
    expect(screen.getByTestId("mode-display")).toBeInTheDocument();
    expect(screen.queryByTestId("order-list")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Login")).not.toBeInTheDocument();
  });

  // ── 7b: Interactive credentials ──

  it("shows login form after clicking Interactive", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    render(<App />);

    fireEvent.click(screen.getByTestId("mode-interactive"));

    expect(screen.getByLabelText("Login")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.queryByTestId("mode-selection")).not.toBeInTheDocument();
  });

  // ── 7c: Interactive login and board ──

  it("completes interactive login and shows board with mode chip", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "staff-jwt",
          tokenType: "Bearer",
          expiresInSeconds: 3600,
          user: STAFF_USER,
        })
      )
      .mockResolvedValueOnce(jsonResponse([SAMPLE_ORDER]));

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    fireEvent.click(screen.getByTestId("mode-interactive"));
    fireEvent.change(screen.getByLabelText("Login"), { target: { value: "staff1" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await screen.findByTestId("auth-status");
    expect(screen.getByTestId("auth-status")).toHaveTextContent("Staff One");

    expect(screen.getByTestId("mode-chip")).toHaveTextContent("Mode: interactive");

    await screen.findByTestId("order-9100");
    expect(screen.getByTestId("order-9100")).toHaveTextContent("#9100");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/auth/login");
    expect(fetchMock.mock.calls[1][0]).toContain("/api/v1/production/orders");
  });

  // ── 7d: Display mode token acquisition ──

  it("acquires display token and shows read-only board", async () => {
    mockGetDisplayToken.mockResolvedValueOnce("display-jwt");

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_ORDER]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    fireEvent.click(screen.getByTestId("mode-display"));

    await screen.findByTestId("mode-chip");
    expect(screen.getByTestId("mode-chip")).toHaveTextContent("Mode: display");

    await screen.findByTestId("order-9100");

    // Order cards should be divs, not buttons (read-only)
    const orderCard = screen.getByTestId("order-9100");
    expect(orderCard.tagName).toBe("DIV");

    // No detail panel in display mode
    expect(screen.queryByTestId("order-detail")).not.toBeInTheDocument();

    expect(mockGetDisplayToken).toHaveBeenCalledTimes(1);
  });

  // ── 7e: Display mode error ──

  it("shows error and Back button when display token acquisition fails", async () => {
    mockGetDisplayToken.mockRejectedValueOnce(new Error("Application token acquisition failed."));

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    render(<App />);

    fireEvent.click(screen.getByTestId("mode-display"));

    await screen.findByTestId("display-loading");
    await waitFor(() => {
      expect(screen.getByText("Application token acquisition failed.")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByTestId("mode-selection")).toBeInTheDocument();
  });

  // ── 7f: Interactive session restore ──

  it("restores interactive session from storage and shows board immediately", async () => {
    setInteractiveSession();

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(screen.getByTestId("auth-status")).toHaveTextContent("Staff One");
    expect(screen.getByTestId("mode-chip")).toHaveTextContent("Mode: interactive");
    expect(screen.queryByTestId("mode-selection")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const boardRequest = fetchMock.mock.calls[0][1] as RequestInit;
    expect(boardRequest.headers).toMatchObject({ Authorization: "Bearer stored-token" });
  });

  // ── 7g: Display session restore ──

  it("restores display session from storage by reacquiring token", async () => {
    setDisplaySession();

    mockGetDisplayToken.mockResolvedValueOnce("reacquired-jwt");

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_ORDER]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    // Should start in display_loading
    expect(screen.getByTestId("display-loading")).toBeInTheDocument();

    // After token acquisition, should show display board
    await screen.findByTestId("mode-chip");
    expect(screen.getByTestId("mode-chip")).toHaveTextContent("Mode: display");

    await screen.findByTestId("order-9100");
    expect(mockGetDisplayToken).toHaveBeenCalledTimes(1);
  });

  // ── 7h: Interactive logout ──

  it("returns to landing screen on interactive logout", async () => {
    setInteractiveSession();

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(screen.getByTestId("auth-status")).toHaveTextContent("Staff One");

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(screen.getByTestId("mode-selection")).toBeInTheDocument();
    expect(sessionStorage.getItem("staff-client-auth")).toBeNull();
  });

  // ── 7i: Display exit ──

  it("returns to landing screen on display exit", async () => {
    mockGetDisplayToken.mockResolvedValueOnce("display-jwt");

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_ORDER]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    fireEvent.click(screen.getByTestId("mode-display"));

    await screen.findByTestId("mode-chip");

    fireEvent.click(screen.getByRole("button", { name: "Exit" }));

    expect(screen.getByTestId("mode-selection")).toBeInTheDocument();
    expect(mockClearDisplayToken).toHaveBeenCalled();
  });

  // ── 7j: Footer removed ──

  it("does not render service config footer", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    render(<App />);

    expect(screen.queryByTestId("service-config")).not.toBeInTheDocument();
  });

  // ── 7k: Back button from credentials ──

  it("returns to landing from credentials via Back button", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    render(<App />);

    fireEvent.click(screen.getByTestId("mode-interactive"));
    expect(screen.getByLabelText("Login")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByTestId("mode-selection")).toBeInTheDocument();
  });

  // ── 7l: Display mode read-only ──

  it("renders display mode as read-only with no command buttons", async () => {
    mockGetDisplayToken.mockResolvedValueOnce("display-jwt");

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_ORDER]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    fireEvent.click(screen.getByTestId("mode-display"));

    await screen.findByTestId("order-9100");

    // No command buttons should exist
    expect(screen.queryByTestId("pickup-item-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ready-item-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("block-item-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("resume-item-1")).not.toBeInTheDocument();

    // No detail panel
    expect(screen.queryByTestId("order-detail")).not.toBeInTheDocument();
  });

  // ── 7m: Pickup command (interactive, adapted for new session format) ──

  it("sends pickup command and refreshes board in interactive mode", async () => {
    setInteractiveSession();

    const fetchMock = vi.fn()
      // Initial board load
      .mockResolvedValueOnce(jsonResponse([SAMPLE_ORDER]))
      // Order detail load
      .mockResolvedValueOnce(jsonResponse(SAMPLE_DETAIL))
      // Pickup command
      .mockResolvedValueOnce(
        jsonResponse({
          itemId: "item-1",
          orderId: 9100,
          status: "IN_PROGRESS",
          command: "pickup",
          executedBy: "Staff One",
        })
      )
      // Detail reload after command
      .mockResolvedValueOnce(
        jsonResponse({
          order: { ...SAMPLE_ORDER, Status: "IN_PROGRESS", Version: 2 },
          items: [{ ...SAMPLE_ITEM, Status: "IN_PROGRESS", ClaimedByUserID: 2001, ClaimedByDisplayName: "Staff One", Version: 2 }],
        })
      )
      // Board reload after command
      .mockResolvedValueOnce(
        jsonResponse([{ ...SAMPLE_ORDER, Status: "IN_PROGRESS", Version: 2 }])
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByTestId("order-9100");
    fireEvent.click(screen.getByTestId("order-9100"));
    await screen.findByTestId("item-item-1");

    fireEvent.click(screen.getByTestId("pickup-item-1"));

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(5);
    });

    const pickupCall = fetchMock.mock.calls[2];
    expect(pickupCall[0]).toContain("/api/v1/production/items/item-1/pickup");
    expect((pickupCall[1] as RequestInit).method).toBe("POST");
    expect((pickupCall[1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer stored-token",
    });
  });

  // ── 7m: Ready command (interactive, adapted for new session format) ──

  it("sends ready command and refreshes order to READY in interactive mode", async () => {
    setInteractiveSession();

    const inProgressItem = {
      ...SAMPLE_ITEM,
      Status: "IN_PROGRESS",
      ClaimedByUserID: 2001,
      ClaimedByDisplayName: "Staff One",
      Version: 2,
    };

    const inProgressOrder = {
      ...SAMPLE_ORDER,
      Status: "IN_PROGRESS",
      Version: 2,
    };

    const fetchMock = vi.fn()
      // Initial board load
      .mockResolvedValueOnce(jsonResponse([inProgressOrder]))
      // Order detail load
      .mockResolvedValueOnce(jsonResponse({ order: inProgressOrder, items: [inProgressItem] }))
      // Ready command
      .mockResolvedValueOnce(
        jsonResponse({
          itemId: "item-1",
          orderId: 9100,
          status: "READY",
          command: "ready",
          executedBy: "Staff One",
        })
      )
      // Detail reload
      .mockResolvedValueOnce(
        jsonResponse({
          order: { ...SAMPLE_ORDER, Status: "READY", ReadyItemCount: 1, Version: 3 },
          items: [{ ...inProgressItem, Status: "READY", Version: 3 }],
        })
      )
      // Board reload
      .mockResolvedValueOnce(
        jsonResponse([{ ...SAMPLE_ORDER, Status: "READY", ReadyItemCount: 1, Version: 3 }])
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
      Authorization: "Bearer stored-token",
    });
  });

  // ── Footer removed in all states ──

  it("does not render service config footer with interactive session", async () => {
    setInteractiveSession();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(screen.queryByTestId("service-config")).not.toBeInTheDocument();
  });
});
