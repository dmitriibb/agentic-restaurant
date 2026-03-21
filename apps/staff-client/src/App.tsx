import { useEffect, useRef, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { login, type UserSummary } from "./features/auth/api";
import { getDisplayToken, clearDisplayToken } from "./features/auth/appToken";
import {
  readPersistedSession,
  writeInteractiveSession,
  writeDisplaySession,
  clearSession,
  type UiSession,
} from "./features/auth/session";
import {
  fetchOrders,
  fetchDisplayOrders,
  fetchOrderDetail,
  sendItemCommand,
} from "./features/production/api";
import type {
  ProductionOrder,
  DisplayOrder,
  ProductionItem,
  OrderDetail,
  ItemCommand,
  ItemStatusCounts,
} from "./features/production/types";
import {
  STATUS_QUEUED,
  STATUS_IN_PROGRESS,
  STATUS_BLOCKED,
  STATUS_READY,
} from "./features/production/types";

const POLL_INTERVAL_MS = 5000;

const LANE_DEFINITIONS = [
  { status: STATUS_QUEUED, label: "Queued" },
  { status: STATUS_IN_PROGRESS, label: "In Progress" },
  { status: STATUS_BLOCKED, label: "Blocked" },
  { status: STATUS_READY, label: "Ready" },
] as const;

const TEXT_SIZE_STORAGE_KEY = "staff-client-text-size";

type TextSize = 1 | 2 | 3;

type AppView =
  | "landing"
  | "interactive_credentials"
  | "display_loading"
  | "interactive_board"
  | "display_board";
function readInitialTextSize(): TextSize {
  if (typeof window === "undefined") {
    return 1;
  }
  const raw = window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
  if (raw === "2" || raw === "3") {
    return Number(raw) as TextSize;
  }
  return 1;
}

function computeInitialState(): { view: AppView; session: UiSession | null } {
  const persisted = readPersistedSession();
  if (!persisted) {
    return { view: "landing", session: null };
  }
  if (persisted.mode === "interactive") {
    return {
      view: "interactive_board",
      session: {
        mode: "interactive",
        authKind: "user",
        accessToken: persisted.token,
        user: persisted.user,
      },
    };
  }
  // display mode: need to reacquire token
  return { view: "display_loading", session: null };
}

function displayUserName(user: UserSummary): string {
  return user.displayName ?? user.login;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

function getAllowedActions(item: ProductionItem): ItemCommand[] {
  switch (item.Status) {
    case STATUS_QUEUED:
      return ["pickup", "block"];
    case STATUS_IN_PROGRESS:
      return ["ready", "block"];
    case STATUS_BLOCKED:
      return ["resume"];
    default:
      return [];
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case STATUS_QUEUED:
      return "status-badge queued";
    case STATUS_IN_PROGRESS:
      return "status-badge in-progress";
    case STATUS_BLOCKED:
      return "status-badge blocked";
    case STATUS_READY:
      return "status-badge ready";
    default:
      return "status-badge";
  }
}

function laneHeaderClass(status: string): string {
  switch (status) {
    case STATUS_QUEUED:
      return "lane-header queued";
    case STATUS_IN_PROGRESS:
      return "lane-header in-progress";
    case STATUS_BLOCKED:
      return "lane-header blocked";
    case STATUS_READY:
      return "lane-header ready";
    default:
      return "lane-header";
  }
}

function renderEmojiSummary(counts: ItemStatusCounts): JSX.Element {
  return (
    <div className="emoji-summary" role="group" aria-label="item status summary">
      <span className="emoji-chip" aria-label={`${counts.Queued} queued`}>
        ⏳ {counts.Queued}
      </span>
      <span className="emoji-chip" aria-label={`${counts.InProgress} in progress`}>
        🍳 {counts.InProgress}
      </span>
      <span className="emoji-chip" aria-label={`${counts.Blocked} blocked`}>
        ⚠️ {counts.Blocked}
      </span>
      <span className="emoji-chip" aria-label={`${counts.Ready} ready`}>
        ✅ {counts.Ready}
      </span>
    </div>
  );
}

function sortOrdersForLane(
  orders: (ProductionOrder | DisplayOrder)[],
  status: string
): (ProductionOrder | DisplayOrder)[] {
  const filtered = orders.filter((o) => o.Status === status);
  if (status === STATUS_READY) {
    // Most recently updated first
    return [...filtered].sort(
      (a, b) => new Date(b.UpdatedAt).getTime() - new Date(a.UpdatedAt).getTime()
    );
  }
  // Oldest first
  return [...filtered].sort(
    (a, b) => new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime()
  );
}

function LocalAccessQR({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return null;
  }

  const localIp = import.meta.env.VITE_LOCAL_IP || "";
  const isLocalHost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const host = isLocalHost ? localIp : window.location.hostname;

  if (!host) {
    return (
      <section className="surface-card qr-card" aria-label="local access qr">
        <h3>QR Access</h3>
        <p className="muted">Set VITE_LOCAL_IP to generate local access QR code.</p>
      </section>
    );
  }

  const url = `${window.location.protocol}//${host}${window.location.port ? `:${window.location.port}` : ""}`;

  return (
    <section className="surface-card qr-card" aria-label="local access qr">
      <h3>QR Access</h3>
      <div className="qr-box">
        <QRCodeSVG value={url} size={126} />
      </div>
      <p className="muted qr-url">{url}</p>
    </section>
  );
}

export function App() {
  const initial = computeInitialState();

  // View state machine
  const [view, setView] = useState<AppView>(initial.view);
  const [session, setSession] = useState<UiSession | null>(initial.session);
  const [displayError, setDisplayError] = useState<string | null>(null);

  // Auth form state
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Board state
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [displayOrders, setDisplayOrders] = useState<DisplayOrder[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  // Detail state
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Command state
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);

  // UI controls
  const [textSize, setTextSize] = useState<TextSize>(readInitialTextSize());
  const [navOpen, setNavOpen] = useState(window.innerWidth >= 768);
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings">("dashboard");
  const navRef = useRef<HTMLElement | null>(null);
  const [collapsedLanes, setCollapsedLanes] = useState<Record<string, boolean>>({
    [STATUS_QUEUED]: false,
    [STATUS_IN_PROGRESS]: false,
    [STATUS_BLOCKED]: false,
    [STATUS_READY]: false,
  });

  useEffect(() => {
    window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, String(textSize));
    const root = document.documentElement;
    root.classList.remove("text-size-1", "text-size-2", "text-size-3");
    root.classList.add(`text-size-${textSize}`);
  }, [textSize]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setNavOpen(true);
      } else {
        setNavOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (window.innerWidth >= 768 || !navOpen || !navRef.current) {
        return;
      }
      const target = event.target as Element;
      if (!navRef.current.contains(target) && !target.closest(".nav-toggle-btn")) {
        setNavOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [navOpen]);

  // --- Display mode token acquisition ---

  async function enterDisplayMode() {
    setView("display_loading");
    setDisplayError(null);
    try {
      const token = await getDisplayToken();
      const newSession: UiSession = {
        mode: "display",
        authKind: "application",
        accessToken: token,
      };
      writeDisplaySession();
      setSession(newSession);
      setView("display_board");
    } catch (error) {
      setDisplayError(error instanceof Error ? error.message : "Failed to connect display mode.");
    }
  }

  // Auto-enter display mode on reload with persisted display session
  useEffect(() => {
    if (view === "display_loading" && !session) {
      void enterDisplayMode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Interactive login ---

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const response = await login(loginValue, password);
      const newSession: UiSession = {
        mode: "interactive",
        authKind: "user",
        accessToken: response.accessToken,
        user: response.user,
      };
      writeInteractiveSession(response.accessToken, response.user);
      setSession(newSession);
      setView("interactive_board");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  // --- Navigation helpers ---

  function goBackToLanding() {
    setLoginValue("");
    setPassword("");
    setAuthError(null);
    setDisplayError(null);
    clearDisplayToken();
    setView("landing");
  }

  function resetAllState() {
    clearDisplayToken();
    clearSession();
    setSession(null);
    setOrders([]);
    setDisplayOrders([]);
    setSelectedOrderId(null);
    setOrderDetail(null);
    setBoardError(null);
    setDetailError(null);
    setCommandError(null);
    setLoginValue("");
    setPassword("");
    setAuthError(null);
    setDisplayError(null);
    setView("landing");
    setActiveTab("dashboard");
  }

  function setSize(size: TextSize) {
    setTextSize(size);
  }

  function toggleLane(status: string) {
    setCollapsedLanes((previous) => ({
      ...previous,
      [status]: !previous[status],
    }));
  }

  // --- Board loading ---

  async function loadBoard(currentToken: string, mode: "interactive" | "display") {
    setBoardLoading(true);
    setBoardError(null);
    try {
      if (mode === "display") {
        const data = await fetchDisplayOrders(currentToken);
        setDisplayOrders(data);
      } else {
        const data = await fetchOrders(currentToken);
        setOrders(data);
      }
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : "Failed to load board.");
    } finally {
      setBoardLoading(false);
    }
  }

  // --- Detail loading (interactive only) ---

  async function loadDetail(orderId: number) {
    if (!session) return;
    setSelectedOrderId(orderId);
    setDetailLoading(true);
    setDetailError(null);
    setCommandError(null);
    try {
      const data = await fetchOrderDetail(session.accessToken, orderId);
      setOrderDetail(data);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Failed to load order.");
    } finally {
      setDetailLoading(false);
    }
  }

  // --- Item command (interactive only) ---

  async function onItemCommand(itemId: string, command: ItemCommand, reason?: string) {
    if (!session || !selectedOrderId) return;
    setCommandLoading(itemId);
    setCommandError(null);
    try {
      await sendItemCommand(session.accessToken, itemId, command, { reason });
      await loadDetail(selectedOrderId);
      await loadBoard(session.accessToken, session.mode as "interactive" | "display");
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : "Command failed.");
    } finally {
      setCommandLoading(null);
    }
  }

  // --- Auto-load board on session established ---

  const isBoardView = view === "interactive_board" || view === "display_board";

  useEffect(() => {
    if (!isBoardView || !session) return;
    const mode = session.mode as "interactive" | "display";
    void loadBoard(session.accessToken, mode);
    const interval = setInterval(() => {
      void loadBoard(session.accessToken, mode);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBoardView, session?.accessToken]);

  // --- Render ---

  // Landing screen
  if (view === "landing") {
    return (
      <div className="app-shell">
        <main>
          <section className="landing-screen" aria-label="mode selection" data-testid="mode-selection">
            <div className="landing-actions">
              <button
                className="landing-mode-card"
                type="button"
                onClick={() => setView("interactive_credentials")}
                data-testid="mode-interactive"
              >
                <span className="landing-mode-title">Interactive</span>
              </button>
              <button
                className="landing-mode-card"
                type="button"
                onClick={() => void enterDisplayMode()}
                data-testid="mode-display"
              >
                <span className="landing-mode-title">Display</span>
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Interactive credentials screen
  if (view === "interactive_credentials") {
    return (
      <div className="app-shell">
        <main>
          <section className="surface-card auth-section" aria-label="authentication">
            <h2>Staff Sign In</h2>
            <form className="auth-form" onSubmit={onLogin}>
              <label>
                Login
                <input
                  value={loginValue}
                  onChange={(event) => setLoginValue(event.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <div className="auth-form-actions">
                <button className="action ghost" type="button" onClick={goBackToLanding}>Back</button>
                <button className="action" type="submit" disabled={authLoading}>
                  {authLoading ? "Signing in..." : "Sign In"}
                </button>
              </div>
            </form>
            {authError && <p className="error-text">{authError}</p>}
          </section>
          <LocalAccessQR hidden={false} />
        </main>
      </div>
    );
  }

  // Display loading screen
  if (view === "display_loading") {
    return (
      <div className="app-shell">
        <main>
          <section className="landing-screen" aria-label="display loading" data-testid="display-loading">
            <p>Connecting display mode...</p>
            {displayError && (
              <>
                <p className="error-text">{displayError}</p>
                <button className="action" type="button" onClick={goBackToLanding}>Back</button>
              </>
            )}
          </section>
        </main>
      </div>
    );
  }

  // Board views (interactive_board and display_board)
  const isDisplay = view === "display_board";
  const currentOrders: (ProductionOrder | DisplayOrder)[] = isDisplay ? displayOrders : orders;
  const hasOrders = currentOrders.length > 0;

  function renderLane(status: string, label: string, laneOrders: (ProductionOrder | DisplayOrder)[]) {
    const collapsed = Boolean(collapsedLanes[status]);
    return (
      <section className={`lane${collapsed ? " lane-collapsed" : ""}`} key={status} data-testid={`lane-${status}`}>
        <button
          type="button"
          className={`${laneHeaderClass(status)} lane-header-toggle`}
          onClick={() => toggleLane(status)}
          aria-expanded={!collapsed}
          data-testid={`lane-toggle-${status}`}
        >
          <span>{label.toUpperCase()} ({laneOrders.length})</span>
          <span className="lane-toggle-indicator" aria-hidden="true">{collapsed ? "▶" : "▼"}</span>
        </button>

        {!collapsed &&
          laneOrders.map((order) => {
            if (isDisplay) {
              return (
                <div key={order.OrderID} className="order-card" data-testid={`order-${order.OrderID}`}>
                  <div className="order-card-header">
                    <strong>Order #{order.OrderID}</strong>
                  </div>
                  {renderEmojiSummary(order.ItemStatusCounts)}
                  <p className="muted">{formatTime(order.CreatedAt)}</p>
                </div>
              );
            }

            const productionOrder = order as ProductionOrder;
            return (
              <button
                key={order.OrderID}
                type="button"
                className={`order-card${selectedOrderId === order.OrderID ? " selected" : ""}`}
                onClick={() => void loadDetail(order.OrderID)}
                data-testid={`order-${order.OrderID}`}
              >
                <div className="order-card-header">
                  <strong>Order #{order.OrderID}</strong>
                </div>
                <p className="muted">
                  {productionOrder.UserDisplayName ?? `User #${productionOrder.UserID}`}
                </p>
                {renderEmojiSummary(order.ItemStatusCounts)}
                <p className="muted">{formatTime(order.CreatedAt)}</p>
              </button>
            );
          })}
      </section>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button
          className="nav-toggle-btn action ghost"
          onClick={() => setNavOpen((current) => !current)}
          aria-label="Toggle Navigation"
          type="button"
        >
          ☰
        </button>
        <h3>Staff Client</h3>
      </header>

      <div className="app-body">
        {navOpen && (
          <nav ref={navRef} className="app-nav">
            <div className="nav-header">
              <button
                className="nav-close-btn action ghost"
                onClick={() => setNavOpen(false)}
                type="button"
                aria-label="Close Navigation"
              >
                ✕
              </button>
            </div>

            <div className="nav-links">
              <button
                type="button"
                className={`nav-link ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                Dashboard
              </button>
              <button
                type="button"
                className={`nav-link ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                Settings
              </button>
            </div>

            <div className="nav-footer" data-testid="text-size-controls">
              <p className="muted">Text size</p>
              <div className="text-size-actions">
                <button className={`action ghost${textSize === 1 ? " active-size" : ""}`} type="button" onClick={() => setSize(1)} aria-label="Set text size A">A</button>
                <button className={`action ghost${textSize === 2 ? " active-size" : ""}`} type="button" onClick={() => setSize(2)} aria-label="Set text size A+">A+</button>
                <button className={`action ghost${textSize === 3 ? " active-size" : ""}`} type="button" onClick={() => setSize(3)} aria-label="Set text size A++">A++</button>
              </div>
              {!isDisplay ? (
                <button className="action ghost" type="button" onClick={resetAllState} aria-label="Logout" title="Logout">
                  Logout
                </button>
              ) : (
                <button className="action ghost" type="button" onClick={resetAllState} aria-label="Exit" title="Exit">
                  Exit
                </button>
              )}
            </div>
          </nav>
        )}

        <main className="app-content-wrapper">
          <div className="app-toolbar">
            <div className="toolbar-left" />
            <div className="toolbar-right">
              {session && (
                <span className="mode-chip" data-testid="mode-chip">
                  Mode: {session.mode}
                </span>
              )}
              {!isDisplay && session?.user && (
                <span className="auth-info" data-testid="auth-status">
                  Signed in as <strong>{displayUserName(session.user)}</strong>
                </span>
              )}
              <button
                className="refresh-control"
                type="button"
                onClick={() => session && void loadBoard(session.accessToken, session.mode as "interactive" | "display")}
                disabled={boardLoading}
                aria-label="Refresh"
                title="Refresh"
              >
                🔄
              </button>
            </div>
          </div>

          {activeTab === "settings" ? (
            <section className="surface-card settings-view" aria-label="settings">
              <h2>Settings</h2>
              <p className="muted">Use text size controls and local QR access from the navigation menu.</p>
            </section>
          ) : (
            <>
        {boardLoading && !hasOrders && <p className="muted">Loading orders...</p>}
        {boardError && <p className="error-text">{boardError}</p>}

        {isDisplay ? (
          /* Display board: foldable lane columns, read-only */
          <div className="board-lanes" data-testid="order-list">
            {LANE_DEFINITIONS.map(({ status, label }) => {
              const laneOrders = sortOrdersForLane(currentOrders, status);
              return renderLane(status, label, laneOrders);
            })}
          </div>
        ) : (
          /* Interactive board: foldable lane columns + detail rail */
          <div className="board-lanes-with-detail" data-testid="order-list">
            {LANE_DEFINITIONS.map(({ status, label }) => {
              const laneOrders = sortOrdersForLane(orders, status);
              return renderLane(status, label, laneOrders);
            })}

            <section className="detail-panel" aria-label="order detail" data-testid="order-detail">
              {selectedOrderId === null ? (
                <p className="muted">Select an order to view details.</p>
              ) : detailLoading ? (
                <p className="muted">Loading order detail...</p>
              ) : detailError ? (
                <p className="error-text">{detailError}</p>
              ) : orderDetail ? (
                <>
                  <div className="detail-header">
                    <h2>Order #{orderDetail.order.OrderID}</h2>
                    <span className={statusBadgeClass(orderDetail.order.Status)}>
                      {orderDetail.order.Status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="muted">
                    Customer: {orderDetail.order.UserDisplayName ?? `User #${orderDetail.order.UserID}`}
                  </p>
                  {commandError && <p className="error-text">{commandError}</p>}
                  <ul className="item-list">
                    {orderDetail.items.map((item) => {
                      const actions = getAllowedActions(item);
                      const isLoading = commandLoading === item.ID;
                      return (
                        <li key={item.ID} className="item-row" data-testid={`item-${item.ID}`}>
                          <div className="item-info">
                            <strong>{item.MenuItemName}</strong>
                            <span className="muted">
                              L{item.LineNumber}U{item.UnitSequence}
                            </span>
                            <span className={statusBadgeClass(item.Status)}>
                              {item.Status.replace("_", " ")}
                            </span>
                            {item.ClaimedByDisplayName && (
                              <span className="muted">Picked by: {item.ClaimedByDisplayName}</span>
                            )}
                            {item.BlockedReason && (
                              <span className="muted blocked-reason">Reason: {item.BlockedReason}</span>
                            )}
                          </div>
                          <div className="item-actions">
                            {actions.map((cmd) => (
                              <button
                                key={cmd}
                                className="action"
                                type="button"
                                disabled={isLoading}
                                onClick={() => void onItemCommand(item.ID, cmd)}
                                data-testid={`${cmd}-${item.ID}`}
                              >
                                {cmd.charAt(0).toUpperCase() + cmd.slice(1)}
                              </button>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}
            </section>
          </div>
        )}

        {!boardLoading && !hasOrders && !boardError && (
          <p className="muted">No production orders.</p>
        )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
