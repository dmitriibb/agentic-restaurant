import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createGuestUser, login, type UserSummary } from "./features/auth/api";
import { getAppToken } from "./features/auth/appToken";
import { readAuthSession, writeAuthSession } from "./features/auth/session";
import { upsertBasketLine, updateLineQuantity, type BasketLine } from "./features/basket/model";
import { fetchMenu, type MenuItem } from "./features/menu/api";
import { submitOrder, type OrderSubmitResponse } from "./features/orders/api";
import { serviceBaseUrls } from "./shared/api/config";

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

type AuthEntryMode = "registered" | "guest";

function displayUserName(user: UserSummary): string {
  return user.displayName ?? user.login;
}

export function App() {
  const existingSession = readAuthSession();
  const [token, setToken] = useState<string>(existingSession?.token ?? "");
  const [user, setUser] = useState<UserSummary | null>(existingSession?.user ?? null);
  const [authEntryMode, setAuthEntryMode] = useState<AuthEntryMode>("registered");

  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [guestDisplayName, setGuestDisplayName] = useState("");

  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrderSubmitResponse | null>(null);

  const basketTotal = useMemo(
    () => basket.reduce((acc, line) => acc + line.item.price * line.quantity, 0),
    [basket]
  );

  const isAuthenticated = Boolean(token && user);

  useEffect(() => {
    void getAppToken().catch((error) => {
      console.error("Failed to initialize application token.", error);
    });
  }, []);

  async function completeAuthentication(nextToken: string, nextUser: UserSummary): Promise<void> {
    const session = { token: nextToken, user: nextUser };
    setToken(nextToken);
    setUser(nextUser);
    writeAuthSession(session);

    setMenuLoading(true);
    try {
      const items = await fetchMenu(nextToken);
      setMenuItems(items);
      setMenuError(null);
    } finally {
      setMenuLoading(false);
    }
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await login(loginValue, password);
      await completeAuthentication(response.accessToken, response.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unexpected login error.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function onGuestLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedDisplayName = guestDisplayName.trim();
    if (!normalizedDisplayName || normalizedDisplayName.length > 100) {
      setAuthError("Guest name is required and must be at most 100 characters.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const appToken = await getAppToken();
      const response = await createGuestUser(normalizedDisplayName, appToken);
      await completeAuthentication(response.accessToken, response.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Guest login failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function reloadMenu() {
    if (!token) {
      return;
    }

    setMenuLoading(true);
    setMenuError(null);
    try {
      const items = await fetchMenu(token);
      setMenuItems(items);
    } catch (error) {
      setMenuError(error instanceof Error ? error.message : "Could not refresh menu.");
    } finally {
      setMenuLoading(false);
    }
  }

  async function placeOrder() {
    if (!token || !user || basket.length === 0) {
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);
    try {
      const orderResponse = await submitOrder(token, user.id, basket);
      setLastOrder(orderResponse);
      setBasket([]);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Order submission failed.");
    } finally {
      setSubmitLoading(false);
    }
  }

  function logout() {
    setToken("");
    setUser(null);
    setMenuItems([]);
    setBasket([]);
    setLastOrder(null);
    setAuthError(null);
    setMenuError(null);
    setSubmitError(null);
    setAuthEntryMode("registered");
    setGuestDisplayName("");
    writeAuthSession(null);
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Restaurant Platform</p>
          <h1>Orders Client</h1>
          <p className="subtitle">Login, browse menu, build basket, and submit orders in one flow.</p>
        </div>
        <div className="hero-actions">
          <button className="action" type="button" onClick={reloadMenu} disabled={!isAuthenticated || menuLoading}>
            Reload Menu
          </button>
          <button className="action ghost" type="button" onClick={logout} disabled={!isAuthenticated}>
            Logout
          </button>
        </div>
      </header>

      <main className="content-grid">
        <section className="surface-card" aria-label="authentication">
          <h2>Authentication</h2>
          {isAuthenticated && user ? (
            <div className="status-panel" data-testid="auth-status">
              <p>
                Signed in as <strong>{displayUserName(user)}</strong> (user #{user.id})
              </p>
            </div>
          ) : (
            <>
              <div className="hero-actions" style={{ marginBottom: "1rem" }}>
                <button
                  className={authEntryMode === "registered" ? "action" : "action ghost"}
                  type="button"
                  onClick={() => {
                    setAuthEntryMode("registered");
                    setAuthError(null);
                  }}
                >
                  Login (Registered)
                </button>
                <button
                  className={authEntryMode === "guest" ? "action" : "action ghost"}
                  type="button"
                  onClick={() => {
                    setAuthEntryMode("guest");
                    setAuthError(null);
                  }}
                >
                  Continue as Guest
                </button>
              </div>

              {authEntryMode === "registered" ? (
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
              ) : (
                <form className="auth-form" onSubmit={onGuestLogin}>
                  <label>
                    Display Name
                    <input
                      value={guestDisplayName}
                      maxLength={100}
                      onChange={(event) => setGuestDisplayName(event.target.value)}
                      required
                    />
                  </label>
                  <button className="action" type="submit" disabled={authLoading}>
                    {authLoading ? "Starting guest session..." : "Start Guest Session"}
                  </button>
                </form>
              )}
            </>
          )}
          {authError && <p className="error-text">{authError}</p>}
        </section>

        <section className="surface-card" aria-label="menu">
          <h2>Menu</h2>
          {!isAuthenticated ? (
            <p className="muted">Sign in to load menu items.</p>
          ) : menuLoading ? (
            <p className="muted">Loading menu...</p>
          ) : (
            <ul className="menu-list" data-testid="menu-list">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.description}</p>
                    <span>{formatAmount(item.price)}</span>
                  </div>
                  <button className="action" type="button" onClick={() => setBasket((prev) => upsertBasketLine(prev, item))}>
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
          {menuError && <p className="error-text">{menuError}</p>}
        </section>

        <section className="surface-card" aria-label="basket and checkout">
          <h2>Basket + Checkout</h2>
          {basket.length === 0 ? (
            <p className="muted">Basket is empty.</p>
          ) : (
            <ul className="basket-list" data-testid="basket-list">
              {basket.map((line) => (
                <li key={line.item.id}>
                  <div>
                    <strong>{line.item.name}</strong>
                    <p>{formatAmount(line.item.price)} each</p>
                  </div>
                  <div className="qty-controls">
                    <button
                      className="action ghost"
                      type="button"
                      onClick={() => setBasket((prev) => updateLineQuantity(prev, line.item.id, line.quantity - 1))}
                    >
                      -
                    </button>
                    <span data-testid={`qty-${line.item.id}`}>{line.quantity}</span>
                    <button
                      className="action ghost"
                      type="button"
                      onClick={() => setBasket((prev) => updateLineQuantity(prev, line.item.id, line.quantity + 1))}
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="checkout-row">
            <p>
              Total: <strong data-testid="basket-total">{formatAmount(basketTotal)}</strong>
            </p>
            <button
              className="action"
              type="button"
              onClick={placeOrder}
              disabled={!isAuthenticated || basket.length === 0 || submitLoading}
            >
              {submitLoading ? "Submitting..." : "Submit Order"}
            </button>
          </div>

          {submitError && <p className="error-text">{submitError}</p>}
          {lastOrder && user && (
            <div className="status-panel" data-testid="order-confirmation">
              <p>
                Order <strong>#{lastOrder.orderId}</strong> accepted ({lastOrder.status}).
              </p>
              <p>
                User: <strong>{lastOrder.userDisplayName ?? displayUserName(user)}</strong> (id #{user.id})
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="service-grid" data-testid="service-config">
        <div>
          <strong>users-service</strong>
          <span>{serviceBaseUrls.usersService}</span>
        </div>
        <div>
          <strong>menu-service</strong>
          <span>{serviceBaseUrls.menuService}</span>
        </div>
        <div>
          <strong>orders-service</strong>
          <span>{serviceBaseUrls.ordersService}</span>
        </div>
      </footer>
    </div>
  );
}
