import {
  ActionButton,
  AppNavigationMenu,
  AppShell,
  ChoiceCard,
  FormTextField,
  InfoCard,
  LocalNetworkQrCode,
  StatusBadge,
  TextSizeControl,
  type AppNavigationMenuItem,
  type TextSizeValue,
} from "@agentic-restaurant/ui-common-libs";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { createGuestUser, login, type UserSummary } from "./features/auth/api";
import { getAppToken } from "./features/auth/appToken";
import { readAuthSession, writeAuthSession, type UiMode } from "./features/auth/session";
import { upsertBasketLine, updateLineQuantity, type BasketLine } from "./features/basket/model";
import { fetchMenu, type MenuItem } from "./features/menu/api";
import { submitOrder, type OrderSubmitResponse } from "./features/orders/api";

const TEXT_SIZE_STORAGE_KEY = "orders-client-text-size";

type EntryStep = "landing" | "registered_credentials" | "guest_name" | "main";
type ActiveTab = "home" | "settings";
type TextSize = TextSizeValue;

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

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
  const [textSize, setTextSize] = useState<TextSize>(readInitialTextSize());
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 700 : false,
  );

  const basketTotal = useMemo(
    () => basket.reduce((acc, line) => acc + line.item.price * line.quantity, 0),
    [basket],
  );

  const isAuthenticated = Boolean(token && user && mode);

  useEffect(() => {
    window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, String(textSize));
    const root = document.documentElement;
    root.classList.remove("text-size-1", "text-size-2", "text-size-3");
    root.classList.add(`text-size-${textSize}`);
  }, [textSize]);

  useEffect(() => {
    const handleResize = () => setIsMobileViewport(window.innerWidth < 700);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

  const navigationItems: AppNavigationMenuItem[] = [
    {
      id: "home",
      label: isAuthenticated ? "Orders & Basket" : "Login",
      active: activeTab === "home",
      onClick: () => setActiveTab("home"),
    },
    {
      id: "settings",
      label: "Settings",
      active: activeTab === "settings",
      onClick: () => setActiveTab("settings"),
    },
  ];

  function renderAuthContent() {
    return (
      <section className="entry-shell" aria-label="authentication" data-testid="auth-gate">
        {entryStep === "landing" ? (
          <div className="entry-stack">
            <section className="entry-card" aria-label="mode selection">
              <div className="mode-choice-grid">
                <ChoiceCard
                  title="Registered user"
                  tone="primary"
                  onClick={() => {
                    setEntryStep("registered_credentials");
                    setAuthError(null);
                  }}
                />
                <ChoiceCard
                  title="Guest"
                  tone="secondary"
                  onClick={() => {
                    setEntryStep("guest_name");
                    setAuthError(null);
                  }}
                />
              </div>
            </section>
            <LocalNetworkQrCode hidden={isMobileViewport} localIp={import.meta.env.VITE_LOCAL_IP} />
          </div>
        ) : null}

        {entryStep === "registered_credentials" ? (
          <div className="entry-card auth-card">
            <InfoCard title="Registered Login" description="Use your existing restaurant account to continue.">
              <form className="auth-form" onSubmit={onLogin}>
                <FormTextField
                  label="Login"
                  value={loginValue}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setLoginValue(event.currentTarget.value)}
                  autoComplete="username"
                  required
                />
                <FormTextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.currentTarget.value)}
                  autoComplete="current-password"
                  required
                />
                <div className="auth-form-actions">
                  <ActionButton type="submit" disabled={authLoading}>
                    {authLoading ? "Signing in..." : "Sign In"}
                  </ActionButton>
                  <ActionButton tone="neutral" variant="outlined" type="button" onClick={resetToLanding} disabled={authLoading}>
                    Back
                  </ActionButton>
                </div>
              </form>
            </InfoCard>
          </div>
        ) : null}

        {entryStep === "guest_name" ? (
          <div className="entry-card auth-card">
            <InfoCard title="Guest Login" description="Pick a display name and start ordering as a guest.">
              <form className="auth-form" onSubmit={onGuestLogin}>
                <FormTextField
                  label="Display Name"
                  value={guestDisplayName}
                  inputProps={{ maxLength: 100 }}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setGuestDisplayName(event.currentTarget.value)}
                  required
                />
                <div className="auth-form-actions">
                  <ActionButton type="submit" disabled={authLoading}>
                    {authLoading ? "Starting guest session..." : "Start Guest Session"}
                  </ActionButton>
                  <ActionButton tone="neutral" variant="outlined" type="button" onClick={resetToLanding} disabled={authLoading}>
                    Back
                  </ActionButton>
                </div>
              </form>
            </InfoCard>
          </div>
        ) : null}

        {authError ? <p className="error-text">{authError}</p> : null}
      </section>
    );
  }

  function renderHomeContent() {
    return (
      <>
        <div className="app-toolbar">
          <div className="toolbar-left">
            <span data-testid="mode-chip">
              <StatusBadge label={`Mode: ${formatMode(mode)}`} tone="info" />
            </span>
          </div>
          <div className="toolbar-right">
            {user ? <span className="auth-info">Ordering as <strong>{displayUserName(user)}</strong></span> : null}
            <ActionButton
              tone="neutral"
              variant="outlined"
              type="button"
              onClick={reloadMenu}
              disabled={menuLoading}
              aria-label="Reload Menu"
              title="Reload Menu"
            >
              Reload Menu
            </ActionButton>
          </div>
        </div>

        <div className="commerce-grid">
          <section className="panel-section" aria-label="menu">
            <InfoCard title="Menu" description="Browse available dishes and add items to the basket.">
              {menuLoading ? (
                <p className="muted">Loading menu...</p>
              ) : (
                <ul className="menu-list" data-testid="menu-list">
                  {menuItems.map((item) => (
                    <li key={item.id} className="catalog-item">
                      <div className="catalog-item-copy">
                        <strong>{item.name}</strong>
                        <p>{item.description}</p>
                        <span className="price-text">{formatAmount(item.price)}</span>
                      </div>
                      <ActionButton type="button" onClick={() => setBasket((prev) => upsertBasketLine(prev, item))}>
                        Add
                      </ActionButton>
                    </li>
                  ))}
                </ul>
              )}
              {menuError ? <p className="error-text">{menuError}</p> : null}
            </InfoCard>
          </section>

          <section className="panel-section" aria-label="basket and checkout">
            <InfoCard title="Basket + Checkout" description="Review quantities and submit the order when ready.">
              {basket.length === 0 ? (
                <p className="muted">Basket is empty.</p>
              ) : (
                <ul className="basket-list" data-testid="basket-list">
                  {basket.map((line) => (
                    <li key={line.item.id} className="basket-item">
                      <div className="catalog-item-copy">
                        <strong>{line.item.name}</strong>
                        <p>{formatAmount(line.item.price)} each</p>
                      </div>
                      <div className="qty-controls">
                        <ActionButton
                          tone="neutral"
                          variant="outlined"
                          type="button"
                          onClick={() => setBasket((prev) => updateLineQuantity(prev, line.item.id, line.quantity - 1))}
                        >
                          -
                        </ActionButton>
                        <span data-testid={`qty-${line.item.id}`}>{line.quantity}</span>
                        <ActionButton
                          tone="neutral"
                          variant="outlined"
                          type="button"
                          onClick={() => setBasket((prev) => updateLineQuantity(prev, line.item.id, line.quantity + 1))}
                        >
                          +
                        </ActionButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="checkout-row">
                <p>
                  Total: <strong data-testid="basket-total">{formatAmount(basketTotal)}</strong>
                </p>
                <ActionButton type="button" onClick={placeOrder} disabled={basket.length === 0 || submitLoading}>
                  {submitLoading ? "Submitting..." : "Submit Order"}
                </ActionButton>
              </div>

              {submitError ? <p className="error-text">{submitError}</p> : null}
              {lastOrder && user ? (
                <div className="status-panel" data-testid="order-confirmation">
                  <p>
                    Order <strong>#{lastOrder.orderId}</strong> accepted ({lastOrder.status}).
                  </p>
                  <p>
                    User: <strong>{lastOrder.userDisplayName ?? displayUserName(user)}</strong> (id #{user.id})
                  </p>
                </div>
              ) : null}
            </InfoCard>
          </section>
        </div>
      </>
    );
  }

  function renderSettings() {
    return (
      <section className="settings-view">
        <InfoCard title="Settings" description="Shared controls now live in the navigation menu for faster access.">
          <p className="muted">Use the text size controls pinned to the bottom of the navigation menu.</p>
          {!isAuthenticated ? <p className="muted">Return to the login view to choose a registered or guest session.</p> : null}
        </InfoCard>
      </section>
    );
  }

  return (
    <AppShell
      navigationContentClassName="app-nav"
      navigation={
        <AppNavigationMenu
          items={navigationItems}
          footer={
            <>
              <TextSizeControl value={textSize} onChange={setTextSize} testId="text-size-controls" />
              {isAuthenticated ? (
                <ActionButton tone="neutral" variant="outlined" type="button" onClick={logout}>
                  Logout
                </ActionButton>
              ) : null}
            </>
          }
        />
      }
    >
      {activeTab === "settings" ? renderSettings() : isAuthenticated ? renderHomeContent() : renderAuthContent()}
    </AppShell>
  );
}
