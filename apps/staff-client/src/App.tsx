import { useEffect, useState, type FormEvent } from "react";
import { login, type UserSummary } from "./features/auth/api";
import { readAuthSession, writeAuthSession } from "./features/auth/session";
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
import { serviceBaseUrls } from "./shared/api/config";

const POLL_INTERVAL_MS = 5000;

const STATUS_SECTIONS = [STATUS_QUEUED, STATUS_IN_PROGRESS, STATUS_BLOCKED, STATUS_READY] as const;

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
  // Auth state
  const existingSession = readAuthSession();
  const [token, setToken] = useState<string>(existingSession?.token ?? "");
  const [user, setUser] = useState<UserSummary | null>(existingSession?.user ?? null);
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

  const isAuthenticated = Boolean(token && user);

  // Login handler
  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const response = await login(loginValue, password);
      setToken(response.accessToken);
      setUser(response.user);
      writeAuthSession({ token: response.accessToken, user: response.user });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  // Logout
  function logout() {
    setToken("");
    setUser(null);
    setOrders([]);
    setSelectedOrderId(null);
    setOrderDetail(null);
    writeAuthSession(null);
  }

  // Load board
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

  // Load order detail
  async function loadDetail(orderId: number) {
    if (!token) return;
    setSelectedOrderId(orderId);
    setDetailLoading(true);
    setDetailError(null);
    setCommandError(null);
    try {
      const data = await fetchOrderDetail(token, orderId);
      setOrderDetail(data);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Failed to load order.");
    } finally {
      setDetailLoading(false);
    }
  }

  // Send item command
  async function onItemCommand(itemId: string, command: ItemCommand, reason?: string) {
    if (!token || !selectedOrderId) return;
    setCommandLoading(itemId);
    setCommandError(null);
    try {
      await sendItemCommand(token, itemId, command, { reason });
      // Reload detail and board after successful command
      await loadDetail(selectedOrderId);
      await loadBoard(token);
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : "Command failed.");
    } finally {
      setCommandLoading(null);
    }
  }

  // Auto-load board on auth and poll
  useEffect(() => {
    if (!isAuthenticated) return;
    void loadBoard(token);
    const interval = setInterval(() => { void loadBoard(token); }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  // Helper: group orders by status
  function ordersByStatus(status: string): ProductionOrder[] {
    return orders.filter((o) => o.Status === status);
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Restaurant Platform</p>
          <h1>Staff Client</h1>
          <p className="subtitle">Production Board</p>
        </div>
        <div className="hero-actions">
          {isAuthenticated && user && (
            <span className="auth-info" data-testid="auth-status">
              Signed in as <strong>{displayUserName(user)}</strong>
            </span>
          )}
          <button
            className="action"
            type="button"
            onClick={() => void loadBoard(token)}
            disabled={!isAuthenticated || boardLoading}
          >
            Refresh
          </button>
          <button className="action ghost" type="button" onClick={logout} disabled={!isAuthenticated}>
            Logout
          </button>
        </div>
      </header>

      <main>
        {!isAuthenticated ? (
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
              <button className="action" type="submit" disabled={authLoading}>
                {authLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>
            {authError && <p className="error-text">{authError}</p>}
          </section>
        ) : (
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

      <footer className="service-grid" data-testid="service-config">
        <div>
          <strong>users-service</strong>
          <span>{serviceBaseUrls.usersService}</span>
        </div>
        <div>
          <strong>production-service</strong>
          <span>{serviceBaseUrls.productionService}</span>
        </div>
      </footer>
    </div>
  );
}
