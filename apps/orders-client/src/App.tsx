import { useMemo, useState, useEffect, useRef, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createGuestUser, login, type UserSummary } from "./features/auth/api";
import { getAppToken } from "./features/auth/appToken";
import { readAuthSession, writeAuthSession, type UiMode } from "./features/auth/session";
import { upsertBasketLine, updateLineQuantity, type BasketLine } from "./features/basket/model";
import { fetchMenu, type MenuItem } from "./features/menu/api";
import { submitOrder, type OrderSubmitResponse } from "./features/orders/api";

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

type EntryStep = "landing" | "registered_credentials" | "guest_name" | "main";
type ActiveTab = "home" | "settings";

function displayUserName(user: UserSummary): string {
  return user.displayName ?? user.login;
}

function formatMode(mode: UiMode | null): string {
  if (mode === "registered") {
    return "registered user";
  }
  if (mode === "guest") {
    return "guest";
  }
  return "not selected";
}

function LocalAccessQR() {
  const defaultIp = import.meta.env.VITE_LOCAL_IP || "";
  const [ipValue, setIpValue] = useState(defaultIp);
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  useEffect(() => {
    if (!isLocalhost) {
      setIpValue(window.location.hostname);
    } else if (defaultIp && !ipValue) {
      setIpValue(defaultIp);
    }
  }, [isLocalhost, defaultIp]);

  const displayUrl = ipValue ? `${window.location.protocol}//${ipValue}${window.location.port ? `:${window.location.port}` : ""}` : "";

  return (
    <div className="qr-container surface-card" style={{ marginTop: "2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <p style={{ marginBottom: "1rem" }}><strong>Local Network Access</strong></p>
      {ipValue ? (
        <>
          <div style={{ background: "white", padding: "10px", borderRadius: "8px" }}>
            <QRCodeSVG value={displayUrl} size={150} />
          </div>
          <p className="muted" style={{ marginTop: "1rem", wordBreak: "break-all" }}>{displayUrl}</p>
          {isLocalhost && (
            <button className="action ghost" style={{ marginTop: "0.5rem" }} onClick={() => setIpValue("")} type="button">Edit IP</button>
          )}
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
           <p className="muted">Enter your local IP (e.g. 192.168.1.100) to generate a QR code for mobile testing.</p>
           <input type="text" placeholder="e.g. 192.168.1.100" style={{ padding: "0.5rem", textAlign: "center" }} onKeyDown={(e) => {
             if (e.key === "Enter") setIpValue(e.currentTarget.value);
           }} onBlur={(e) => setIpValue(e.currentTarget.value)} />
        </div>
      )}
    </div>
  );
}

export function App() {
  const existingSession = readAuthSession();
  const [token, setToken] = useState<string>(existingSession?.token ?? "");
  const [user, setUser] = useState<UserSummary | null>(existingSession?.user ?? null);
  const [mode, setMode] = useState<UiMode | null>(existingSession?.mode ?? null);
  const [entryStep, setEntryStep] = useState<EntryStep>(existingSession ? "main" : "landing");

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

  const [navVisible, setNavVisible] = useState(false);
  const [textSize, setTextSize] = useState<1 | 2 | 3>(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const navRef = useRef<HTMLElement>(null);

  const basketTotal = useMemo(
    () => basket.reduce((acc, line) => acc + line.item.price * line.quantity, 0),
    [basket]
  );

  const isAuthenticated = Boolean(token && user && mode);

  useEffect(() => {
    document.documentElement.className = `text-size-${textSize}`;
  }, [textSize]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (window.innerWidth < 768 && navVisible && navRef.current && !navRef.current.contains(e.target as Node)) {
        if (!(e.target as Element).closest(".nav-toggle-btn")) {
          setNavVisible(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [navVisible]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setNavVisible(true);
      } else {
        setNavVisible(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function completeAuthentication(nextToken: string, nextUser: UserSummary, nextMode: UiMode): Promise<void> {
    const session = { token: nextToken, user: nextUser, mode: nextMode };
    setToken(nextToken);
    setUser(nextUser);
    setMode(nextMode);
    setEntryStep("main");
    setActiveTab("home");
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
      await completeAuthentication(response.accessToken, response.user, "registered");
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
      await completeAuthentication(response.accessToken, response.user, "guest");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Guest login failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function reloadMenu() {
    if (!token) return;
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
    if (!token || !user || basket.length === 0) return;
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

  function resetToLanding() {
    setEntryStep("landing");
    setAuthError(null);
    setAuthLoading(false);
    setLoginValue("");
    setPassword("");
    setGuestDisplayName("");
  }

  function logout() {
    setToken("");
    setUser(null);
    setMode(null);
    setMenuItems([]);
    setBasket([]);
    setLastOrder(null);
    setAuthError(null);
    setMenuError(null);
    setSubmitError(null);
    resetToLanding();
    setActiveTab("home");
    writeAuthSession(null);
  }

  const renderAuthContent = () => (
    <main className="entry-shell" aria-label="authentication" data-testid="auth-gate">
      {entryStep === "landing" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%", maxWidth: "480px" }}>
            <section className="entry-card" aria-label="mode selection">
              <div className="mode-choice-grid">
                <button className="mode-choice mode-choice-primary" type="button" onClick={() => { setEntryStep("registered_credentials"); setAuthError(null); }}>
                  <span className="mode-choice-title">Registered User</span>
                </button>
                <button className="mode-choice mode-choice-secondary" type="button" onClick={() => { setEntryStep("guest_name"); setAuthError(null); }}>
                  <span className="mode-choice-title">Guest</span>
                </button>
              </div>
            </section>
            <LocalAccessQR />
          </div>
        ) : null}

      {entryStep === "registered_credentials" ? (
        <section className="surface-card entry-card">
          <h2>Registered Login</h2>
          <form className="auth-form" onSubmit={onLogin}>
            <label>Login <input value={loginValue} onChange={(e) => setLoginValue(e.target.value)} autoComplete="username" required /></label>
            <label>Password <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
            <div className="hero-actions">
              <button className="action" type="submit" disabled={authLoading}>{authLoading ? "Signing in..." : "Sign In"}</button>
              <button className="action ghost" type="button" onClick={resetToLanding} disabled={authLoading}>Back</button>
            </div>
          </form>
        </section>
      ) : null}

      {entryStep === "guest_name" ? (
        <section className="surface-card entry-card">
          <h2>Guest Login</h2>
          <form className="auth-form" onSubmit={onGuestLogin}>
            <label>Display Name <input value={guestDisplayName} maxLength={100} onChange={(e) => setGuestDisplayName(e.target.value)} required /></label>
            <div className="hero-actions">
              <button className="action" type="submit" disabled={authLoading}>{authLoading ? "Starting guest session..." : "Start Guest Session"}</button>
              <button className="action ghost" type="button" onClick={resetToLanding} disabled={authLoading}>Back</button>
            </div>
          </form>
        </section>
      ) : null}

      {authError ? <p className="error-text">{authError}</p> : null}
    </main>
  );

  const renderHomeContent = () => (
    <div className="content-grid main-content">
      <div className="app-toolbar">
        <p className="mode-chip" data-testid="mode-chip">Mode: {formatMode(mode)}</p>
        <button className="action icon-btn" type="button" onClick={reloadMenu} disabled={menuLoading} aria-label="Reload Menu" title="Reload Menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
        </button>
      </div>

      <section className="surface-card" aria-label="menu">
        <h2>Menu</h2>
        {menuLoading ? (
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
                <button className="action" type="button" onClick={() => setBasket((prev) => upsertBasketLine(prev, item))}>Add</button>
              </li>
            ))}
          </ul>
        )}
        {menuError ? <p className="error-text">{menuError}</p> : null}
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
                  <button className="action ghost" type="button" onClick={() => setBasket((prev) => updateLineQuantity(prev, line.item.id, line.quantity - 1))}>-</button>
                  <span data-testid={`qty-${line.item.id}`}>{line.quantity}</span>
                  <button className="action ghost" type="button" onClick={() => setBasket((prev) => updateLineQuantity(prev, line.item.id, line.quantity + 1))}>+</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="checkout-row">
          <p>Total: <strong data-testid="basket-total">{formatAmount(basketTotal)}</strong></p>
          <button className="action" type="button" onClick={placeOrder} disabled={basket.length === 0 || submitLoading}>{submitLoading ? "Submitting..." : "Submit Order"}</button>
        </div>

        {submitError ? <p className="error-text">{submitError}</p> : null}
        {lastOrder && user ? (
          <div className="status-panel" data-testid="order-confirmation">
            <p>Order <strong>#{lastOrder.orderId}</strong> accepted ({lastOrder.status}).</p>
            <p>User: <strong>{lastOrder.userDisplayName ?? displayUserName(user)}</strong> (id #{user.id})</p>
          </div>
        ) : null}
      </section>
    </div>
  );

  const renderSettings = () => (
    <div className="content-grid main-content" style={{ marginTop: '2rem' }}>
      <section className="surface-card">
        <h2>Settings</h2>
        <div className="settings-section">
          <h3>Text Size Options</h3>
          <p className="muted">Adjust the text size for better readability.</p>
          <div className="text-size-controls" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className={`action ${textSize === 1 ? '' : 'ghost'}`} onClick={() => setTextSize(1)}>Small (Default)</button>
            <button className={`action ${textSize === 2 ? '' : 'ghost'}`} onClick={() => setTextSize(2)}>Medium</button>
            <button className={`action ${textSize === 3 ? '' : 'ghost'}`} onClick={() => setTextSize(3)}>Large</button>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="nav-toggle-btn action ghost" onClick={() => setNavVisible(!navVisible)} aria-label="Toggle Navigation">
          ☰
        </button>
        <h3>Restaurant App</h3>
      </header>
      
      <div className="app-body">
        {navVisible && (
          <nav ref={navRef} className="app-nav">
            <div className="nav-header">
              <button className="nav-close-btn action ghost" onClick={() => setNavVisible(false)}>✕</button>
            </div>
            <div className="nav-links">
              {isAuthenticated ? (
                <button className={`nav-link ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
                  Orders & Basket
                </button>
              ) : (
                <button className={`nav-link ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
                  Login
                </button>
              )}
              <button className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                Settings
              </button>
            </div>
            <div className="nav-footer">
              {isAuthenticated ? (
                <button className="action ghost w-full logout-btn" onClick={logout}>Logout</button>
              ) : null}
            </div>
          </nav>
        )}

        <main className="app-content-wrapper">
          {activeTab === 'settings' 
            ? renderSettings() 
            : (!isAuthenticated ? renderAuthContent() : renderHomeContent())
          }
        </main>
      </div>
    </div>
  );
}
