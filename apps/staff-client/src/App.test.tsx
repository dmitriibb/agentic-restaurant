import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  ItemStatusCounts: { Queued: 2, InProgress: 0, Blocked: 0, Ready: 0 },
  CreatedAt: "2026-03-14T13:47:40Z",
  UpdatedAt: "2026-03-14T13:47:40Z",
  ReadyAt: null,
  Version: 1,
};

const SAMPLE_DISPLAY_ORDER = {
  OrderID: 9100,
  Status: "QUEUED",
  TotalItemCount: 2,
  ItemStatusCounts: { Queued: 2, InProgress: 0, Blocked: 0, Ready: 0 },
  CreatedAt: "2026-03-14T13:47:40Z",
  UpdatedAt: "2026-03-14T13:47:40Z",
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

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  window.dispatchEvent(new Event("resize"));
}

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
    document.documentElement.className = "";
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

  // ── 7d: Display mode token acquisition and display endpoint ──

  it("acquires display token and shows read-only board using display endpoint", async () => {
    mockGetDisplayToken.mockResolvedValueOnce("display-jwt");

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_DISPLAY_ORDER]));
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

    // Display mode uses the display endpoint
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/production/display/orders");

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

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_DISPLAY_ORDER]));
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

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_DISPLAY_ORDER]));
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

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_DISPLAY_ORDER]));
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

    // Display cards should not show customer name
    expect(screen.queryByText("Demo User")).not.toBeInTheDocument();
  });

  // ── 7m: Pickup command (interactive) ──

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
          order: { ...SAMPLE_ORDER, Status: "IN_PROGRESS", Version: 2, ItemStatusCounts: { Queued: 1, InProgress: 1, Blocked: 0, Ready: 0 } },
          items: [{ ...SAMPLE_ITEM, Status: "IN_PROGRESS", ClaimedByUserID: 2001, ClaimedByDisplayName: "Staff One", Version: 2 }],
        })
      )
      // Board reload after command
      .mockResolvedValueOnce(
        jsonResponse([{ ...SAMPLE_ORDER, Status: "IN_PROGRESS", Version: 2, ItemStatusCounts: { Queued: 1, InProgress: 1, Blocked: 0, Ready: 0 } }])
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

  // ── 7m: Ready command (interactive) ──

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
      ItemStatusCounts: { Queued: 0, InProgress: 1, Blocked: 0, Ready: 0 },
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
          order: { ...SAMPLE_ORDER, Status: "READY", Version: 3, ItemStatusCounts: { Queued: 0, InProgress: 0, Blocked: 0, Ready: 1 } },
          items: [{ ...inProgressItem, Status: "READY", Version: 3 }],
        })
      )
      // Board reload
      .mockResolvedValueOnce(
        jsonResponse([{ ...SAMPLE_ORDER, Status: "READY", Version: 3, ItemStatusCounts: { Queued: 0, InProgress: 0, Blocked: 0, Ready: 1 } }])
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

  // ── Step 10: Mixed-status emoji summary rendering ──

  it("renders mixed-status order in correct lane with emoji summary", async () => {
    setInteractiveSession();

    const mixedOrder = {
      ...SAMPLE_ORDER,
      OrderID: 9200,
      Status: "IN_PROGRESS",
      TotalItemCount: 6,
      ItemStatusCounts: { Queued: 2, InProgress: 1, Blocked: 0, Ready: 3 },
    };

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([mixedOrder]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByTestId("order-9200");

    // Order appears in IN_PROGRESS lane only
    const inProgressLane = screen.getByTestId("lane-IN_PROGRESS");
    expect(within(inProgressLane).getByTestId("order-9200")).toBeInTheDocument();

    // Not in other lanes
    const queuedLane = screen.getByTestId("lane-QUEUED");
    expect(within(queuedLane).queryByTestId("order-9200")).not.toBeInTheDocument();
    const blockedLane = screen.getByTestId("lane-BLOCKED");
    expect(within(blockedLane).queryByTestId("order-9200")).not.toBeInTheDocument();
    const readyLane = screen.getByTestId("lane-READY");
    expect(within(readyLane).queryByTestId("order-9200")).not.toBeInTheDocument();

    // Check emoji summary with accessible labels
    const orderCard = screen.getByTestId("order-9200");
    expect(within(orderCard).getByLabelText("2 queued")).toBeInTheDocument();
    expect(within(orderCard).getByLabelText("1 in progress")).toBeInTheDocument();
    expect(within(orderCard).getByLabelText("0 blocked")).toBeInTheDocument();
    expect(within(orderCard).getByLabelText("3 ready")).toBeInTheDocument();

    // Verify the item status summary group
    expect(within(orderCard).getByRole("group", { name: "item status summary" })).toBeInTheDocument();
  });

  // ── Step 11: Interactive detail flow with lane layout ──

  it("opens detail rail after clicking order in lane and shows item commands", async () => {
    setInteractiveSession();

    const fetchMock = vi.fn()
      // Initial board load
      .mockResolvedValueOnce(jsonResponse([SAMPLE_ORDER]))
      // Order detail load
      .mockResolvedValueOnce(jsonResponse(SAMPLE_DETAIL));

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByTestId("order-9100");

    // Order is in the QUEUED lane
    const queuedLane = screen.getByTestId("lane-QUEUED");
    const orderCard = within(queuedLane).getByTestId("order-9100");
    expect(orderCard.tagName).toBe("BUTTON");

    // Click order to open detail
    fireEvent.click(orderCard);

    // Detail rail opens with order info
    await screen.findByTestId("item-item-1");
    const detailPanel = screen.getByTestId("order-detail");
    expect(detailPanel).toBeInTheDocument();
    expect(within(detailPanel).getByText("Order #9100")).toBeInTheDocument();
    expect(within(detailPanel).getByText("Margherita Pizza")).toBeInTheDocument();

    // Item commands are available
    expect(screen.getByTestId("pickup-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("block-item-1")).toBeInTheDocument();
  });

  // ── Step 12: Display mode uses display endpoint ──

  it("uses display endpoint in display mode, not interactive endpoint", async () => {
    mockGetDisplayToken.mockResolvedValueOnce("display-jwt");

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_DISPLAY_ORDER]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    fireEvent.click(screen.getByTestId("mode-display"));

    await screen.findByTestId("order-9100");

    // Verify the fetch URL is the display endpoint
    expect(fetchMock).toHaveBeenCalled();
    const fetchUrl = fetchMock.mock.calls[0][0] as string;
    expect(fetchUrl).toContain("/api/v1/production/display/orders");
    expect(fetchUrl).not.toMatch(/\/api\/v1\/production\/orders\?/);

    // Display cards show order number and emoji summary but no customer name
    const orderCard = screen.getByTestId("order-9100");
    expect(orderCard).toHaveTextContent("#9100");
    expect(within(orderCard).getByLabelText("2 queued")).toBeInTheDocument();
    expect(screen.queryByText("Demo User")).not.toBeInTheDocument();
  });

  // ── Lane placement by order status ──

  it("places orders in correct lanes by order status", async () => {
    setInteractiveSession();

    const orders = [
      { ...SAMPLE_ORDER, OrderID: 9001, Status: "QUEUED" },
      { ...SAMPLE_ORDER, OrderID: 9002, Status: "IN_PROGRESS", ItemStatusCounts: { Queued: 0, InProgress: 2, Blocked: 0, Ready: 0 } },
      { ...SAMPLE_ORDER, OrderID: 9003, Status: "BLOCKED", ItemStatusCounts: { Queued: 0, InProgress: 0, Blocked: 2, Ready: 0 } },
      { ...SAMPLE_ORDER, OrderID: 9004, Status: "READY", ItemStatusCounts: { Queued: 0, InProgress: 0, Blocked: 0, Ready: 2 } },
    ];

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(orders));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByTestId("order-9001");

    expect(within(screen.getByTestId("lane-QUEUED")).getByTestId("order-9001")).toBeInTheDocument();
    expect(within(screen.getByTestId("lane-IN_PROGRESS")).getByTestId("order-9002")).toBeInTheDocument();
    expect(within(screen.getByTestId("lane-BLOCKED")).getByTestId("order-9003")).toBeInTheDocument();
    expect(within(screen.getByTestId("lane-READY")).getByTestId("order-9004")).toBeInTheDocument();
  });

  it("toggles lane fold state and keeps accurate header count", async () => {
    setViewport(1280);
    setInteractiveSession();

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_ORDER]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByTestId("order-9100");

    const queuedToggle = screen.getByTestId("lane-toggle-QUEUED");
    expect(queuedToggle).toHaveTextContent("QUEUED (1)");
    expect(queuedToggle).toHaveTextContent("▼");

    fireEvent.click(queuedToggle);
    expect(queuedToggle).toHaveTextContent("▶");
    expect(within(screen.getByTestId("lane-QUEUED")).queryByTestId("order-9100")).not.toBeInTheDocument();

    fireEvent.click(queuedToggle);
    expect(queuedToggle).toHaveTextContent("▼");
    expect(await within(screen.getByTestId("lane-QUEUED")).findByTestId("order-9100")).toBeInTheDocument();
  });

  it("applies enlarge text classes from sidebar controls", async () => {
    setViewport(1280);
    setInteractiveSession();

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_ORDER]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByTestId("text-size-controls");
    expect(screen.getByText("Text size")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Set text size A++" }));

    expect(document.documentElement.classList.contains("text-size-3")).toBe(true);
  });

  it("shows QR only on login view and not on dashboard", async () => {
    setViewport(1280);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    const loginRender = render(<App />);
    fireEvent.click(screen.getByTestId("mode-interactive"));
    await screen.findByLabelText("Login");
    expect(screen.getByText("QR Access")).toBeInTheDocument();

    loginRender.unmount();

    setInteractiveSession();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([SAMPLE_ORDER])));

    render(<App />);
    await screen.findByTestId("order-9100");
    expect(screen.queryByText("QR Access")).not.toBeInTheDocument();
  });

  it("keeps navigation open by default on desktop like orders-client", async () => {
    setViewport(1280);
    setInteractiveSession();

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_ORDER]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByTestId("order-9100");

    const navElement = document.querySelector(".app-nav");
    expect(navElement).not.toBeNull();
    expect(screen.getByRole("button", { name: "Toggle Navigation" })).toBeInTheDocument();
  });

  it("uses orders-client style mobile navigation toggle behavior", async () => {
    setViewport(390);
    setInteractiveSession();

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_ORDER]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByTestId("order-9100");

    expect(document.querySelector(".app-nav")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Toggle Navigation" }));
    expect(document.querySelector(".app-nav")).not.toBeNull();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(document.querySelector(".app-nav")).toBeNull();
    });
  });

  it("keeps top toolbar focused on refresh without logout/exit actions", async () => {
    setViewport(1280);
    setInteractiveSession();

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([SAMPLE_ORDER]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByTestId("order-9100");

    const toolbar = document.querySelector(".app-toolbar") as HTMLElement;
    expect(within(toolbar).getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(within(toolbar).queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
    expect(within(toolbar).queryByRole("button", { name: "Exit" })).not.toBeInTheDocument();
  });
});
