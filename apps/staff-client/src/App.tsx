import { useEffect, useState, type FormEvent } from "react";
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
  fetchOrderDetail,
  sendItemCommand,
} from "./features/production/api";
import type {
  ProductionOrder,
  ProductionItem,
  OrderDetail,
  ItemCommand,
} from "./features/production/types";
import {
  STATUS_QUEUED,
  STATUS_IN_PROGRESS,
  STATUS_BLOCKED,
  STATUS_READY,
} from "./features/production/types";

const POLL_INTERVAL_MS = 5000;

const STATUS_SECTIONS = [STATUS_QUEUED, STATUS_IN_PROGRESS, STATUS_BLOCKED, STATUS_READY] as const;

type AppView =
  | "landing"
  | "interactive_credentials"
  | "display_loading"
  | "interactive_board"
  | "display_board";

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
  }

  // --- Board loading ---

  async function loadBoard(currentToken: string) {
    setBoardLoading(true);
    setBoardError(null);
    try {
      const data = await fetchOrders(currentToken);
      setOrders(data);
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
      await loadBoard(session.accessToken);
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
    void loadBoard(session.accessToken);
    const interval = setInterval(() => {
      void loadBoard(session.accessToken);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBoardView, session?.accessToken]);

  // --- Helpers ---

  function ordersByStatus(status: string): ProductionOrder[] {
    return orders.filter((o) => o.Status === status);
  }

  // --- Render ---

  // Landing screen
  if (view === "landing") {
    return (
      <div className="app-shell">
        <header className="hero">
          <div>
            <p className="eyebrow">Restaurant Platform</p>
            <h1>Staff Client</h1>
            <p className="subtitle">Production Board</p>
          </div>
        </header>
        <main>
          <section className="landing-screen" aria-label="mode selection" data-testid="mode-selection">
            <h2>Staff Client</h2>
            <p>Select a mode to continue</p>
            <div className="landing-actions">
              <button
                className="action landing-btn"
                type="button"
                onClick={() => setView("interactive_credentials")}
                data-testid="mode-interactive"
              >
                Interactive
              </button>
              <button
                className="action landing-btn"
                type="button"
                onClick={() => void enterDisplayMode()}
                data-testid="mode-display"
              >
                Display
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
        <header className="hero">
          <div>
            <p className="eyebrow">Restaurant Platform</p>
            <h1>Staff Client</h1>
            <p className="subtitle">Production Board</p>
          </div>
        </header>
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
        </main>
      </div>
    );
  }

  // Display loading screen
  if (view === "display_loading") {
    return (
      <div className="app-shell">
        <header className="hero">
          <div>
            <p className="eyebrow">Restaurant Platform</p>
            <h1>Staff Client</h1>
            <p className="subtitle">Production Board</p>
          </div>
        </header>
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

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Restaurant Platform</p>
          <h1>Staff Client</h1>
          <p className="subtitle">Production Board</p>
        </div>
        <div className="hero-actions">
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
          {!isDisplay && (
            <button
              className="action"
              type="button"
              onClick={() => session && void loadBoard(session.accessToken)}
              disabled={boardLoading}
            >
              Refresh
            </button>
          )}
          {isDisplay && (
            <button
              className="action"
              type="button"
              onClick={() => session && void loadBoard(session.accessToken)}
              disabled={boardLoading}
            >
              Refresh
            </button>
          )}
          {!isDisplay ? (
            <button className="action ghost" type="button" onClick={resetAllState}>
              Logout
            </button>
          ) : (
            <button className="action ghost" type="button" onClick={resetAllState}>
              Exit
            </button>
          )}
        </div>
      </header>

      <main>
        {isDisplay ? (
          /* Display board: read-only, no detail panel */
          <div className="board-layout" style={{ gridTemplateColumns: "1fr" }}>
            <section className="order-list-panel" aria-label="order list" data-testid="order-list">
              <h2>Orders</h2>
              {boardLoading && orders.length === 0 && <p className="muted">Loading orders...</p>}
              {boardError && <p className="error-text">{boardError}</p>}
              {STATUS_SECTIONS.map((status) => {
                const group = ordersByStatus(status);
                if (group.length === 0) return null;
                return (
                  <div className="status-section" key={status}>
                    <h3 className={statusBadgeClass(status)}>{status.replace("_", " ")}</h3>
                    {group.map((order) => (
                      <div
                        key={order.OrderID}
                        className="order-card"
                        data-testid={`order-${order.OrderID}`}
                      >
                        <div className="order-card-header">
                          <strong>Order #{order.OrderID}</strong>
                          <span className={statusBadgeClass(order.Status)}>{order.Status.replace("_", " ")}</span>
                        </div>
                        <p className="muted">
                          Items: {order.ReadyItemCount}/{order.TotalItemCount} ready
                          {order.BlockedItemCount > 0 && ` | ${order.BlockedItemCount} blocked`}
                        </p>
                        <p className="muted">{formatTime(order.CreatedAt)}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
              {!boardLoading && orders.length === 0 && !boardError && (
                <p className="muted">No production orders.</p>
              )}
            </section>
          </div>
        ) : (
          /* Interactive board: full functionality */
          <div className="board-layout">
            <section className="order-list-panel" aria-label="order list" data-testid="order-list">
              <h2>Orders</h2>
              {boardLoading && orders.length === 0 && <p className="muted">Loading orders...</p>}
              {boardError && <p className="error-text">{boardError}</p>}
              {STATUS_SECTIONS.map((status) => {
                const group = ordersByStatus(status);
                if (group.length === 0) return null;
                return (
                  <div className="status-section" key={status}>
                    <h3 className={statusBadgeClass(status)}>{status.replace("_", " ")}</h3>
                    {group.map((order) => (
                      <button
                        key={order.OrderID}
                        type="button"
                        className={`order-card${selectedOrderId === order.OrderID ? " selected" : ""}`}
                        onClick={() => void loadDetail(order.OrderID)}
                        data-testid={`order-${order.OrderID}`}
                      >
                        <div className="order-card-header">
                          <strong>Order #{order.OrderID}</strong>
                          <span className={statusBadgeClass(order.Status)}>{order.Status.replace("_", " ")}</span>
                        </div>
                        <p className="muted">
                          {order.UserDisplayName ?? `User #${order.UserID}`}
                        </p>
                        <p className="muted">
                          Items: {order.ReadyItemCount}/{order.TotalItemCount} ready
                          {order.BlockedItemCount > 0 && ` | ${order.BlockedItemCount} blocked`}
                        </p>
                        <p className="muted">{formatTime(order.CreatedAt)}</p>
                      </button>
                    ))}
                  </div>
                );
              })}
              {!boardLoading && orders.length === 0 && !boardError && (
                <p className="muted">No production orders.</p>
              )}
            </section>

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
                              <span className="muted">Claimed by: {item.ClaimedByDisplayName}</span>
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
      </main>
    </div>
  );
}
