import {
  ActionButton,
  AppNavigationMenu,
  AppShell,
  ChoiceCard,
  FormTextField,
  InfoCard,
  StatusBadge,
  TextSizeControl,
  type AppNavigationMenuItem,
  type StatusBadgeTone,
  type TextSizeValue,
} from "@agentic-restaurant/ui-common-libs";
import { useEffect, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { login, type UserSummary } from "./features/auth/api";
import { clearDisplayToken, getDisplayToken } from "./features/auth/appToken";
import {
  clearSession,
  readPersistedSession,
  writeDisplaySession,
  writeInteractiveSession,
  type UiSession,
} from "./features/auth/session";
import {
  fetchDisplayOrders,
  fetchOrderDetail,
  fetchOrders,
  sendItemCommand,
} from "./features/production/api";
import {
  STATUS_BLOCKED,
  STATUS_IN_PROGRESS,
  STATUS_QUEUED,
  STATUS_READY,
} from "./features/production/types";
import type {
  DisplayOrder,
  ItemCommand,
  ItemStatusCounts,
  OrderDetail,
  ProductionItem,
  ProductionOrder,
} from "./features/production/types";

const POLL_INTERVAL_MS = 5000;

const LANE_DEFINITIONS = [
  { status: STATUS_QUEUED, label: "Queued" },
  { status: STATUS_IN_PROGRESS, label: "In Progress" },
  { status: STATUS_BLOCKED, label: "Blocked" },
  { status: STATUS_READY, label: "Ready" },
] as const;

const TEXT_SIZE_STORAGE_KEY = "staff-client-text-size";

type TextSize = TextSizeValue;

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

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function statusTone(status: string): StatusBadgeTone {
  switch (status) {
    case STATUS_IN_PROGRESS:
      return "info";
    case STATUS_BLOCKED:
      return "warning";
    case STATUS_READY:
      return "success";
    default:
      return "neutral";
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

function renderEmojiSummary(counts: ItemStatusCounts) {
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
  status: string,
): (ProductionOrder | DisplayOrder)[] {
  const filtered = orders.filter((order) => order.Status === status);
  if (status === STATUS_READY) {
    return [...filtered].sort(
      (left, right) => new Date(right.UpdatedAt).getTime() - new Date(left.UpdatedAt).getTime(),
    );
  }

  return [...filtered].sort(
    (left, right) => new Date(left.CreatedAt).getTime() - new Date(right.CreatedAt).getTime(),
  );
}

function LocalAccessQR({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return null;
  }

  const defaultIp = import.meta.env.VITE_LOCAL_IP || "";
  const [ipValue, setIpValue] = useState(defaultIp);
  const isLocalhost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  useEffect(() => {
    if (!isLocalhost) {
      setIpValue(window.location.hostname);
    } else if (defaultIp && !ipValue) {
      setIpValue(defaultIp);
    }
  }, [defaultIp, ipValue, isLocalhost]);

  const displayUrl = ipValue
    ? `${window.location.protocol}//${ipValue}${window.location.port ? `:${window.location.port}` : ""}`
    : "";

  return (
    <InfoCard
      title="Local Network Access"
      description="Generate a QR code so kitchen devices on your local network can open this client."
    >
      {ipValue ? (
        <>
          <div className="qr-box">
            <QRCodeSVG value={displayUrl} size={150} />
          </div>
          <p className="muted qr-url">{displayUrl}</p>
          {isLocalhost ? (
            <ActionButton tone="neutral" variant="outlined" type="button" onClick={() => setIpValue("")}>
              Edit IP
            </ActionButton>
          ) : null}
        </>
      ) : (
        <div className="qr-edit">
          <p className="muted">
            Enter your local IP, for example 192.168.1.100, to generate a QR code for mobile testing.
          </p>
          <FormTextField
            label="Local IP"
            placeholder="192.168.1.100"
            defaultValue={defaultIp}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const input = event.target as HTMLInputElement;
                setIpValue(input.value);
              }
            }}
            onBlur={(event) => setIpValue(event.target.value)}
          />
        </div>
      )}
    </InfoCard>
  );
}

export function App() {
  const initial = computeInitialState();

  const [view, setView] = useState<AppView>(initial.view);
  const [session, setSession] = useState<UiSession | null>(initial.session);
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [displayOrders, setDisplayOrders] = useState<DisplayOrder[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [textSize, setTextSize] = useState<TextSize>(readInitialTextSize());
  const [isMobileViewport, setIsMobileViewport] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings">("dashboard");
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
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  async function enterDisplayMode() {
    setView("display_loading");
    setDisplayError(null);
    try {
      const token = await getDisplayToken();
      const nextSession: UiSession = {
        mode: "display",
        authKind: "application",
        accessToken: token,
      };
      writeDisplaySession();
      setSession(nextSession);
      setView("display_board");
    } catch (error) {
      setDisplayError(error instanceof Error ? error.message : "Failed to connect display mode.");
    }
  }

  useEffect(() => {
    if (view === "display_loading" && !session) {
      void enterDisplayMode();
    }
  }, [session, view]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const response = await login(loginValue, password);
      const nextSession: UiSession = {
        mode: "interactive",
        authKind: "user",
        accessToken: response.accessToken,
        user: response.user,
      };
      writeInteractiveSession(response.accessToken, response.user);
      setSession(nextSession);
      setView("interactive_board");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  }

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

  function toggleLane(status: string) {
    setCollapsedLanes((previous) => ({
      ...previous,
      [status]: !previous[status],
    }));
  }

  async function loadBoard(currentToken: string, mode: "interactive" | "display") {
    setBoardLoading(true);
    setBoardError(null);
    try {
      if (mode === "display") {
        setDisplayOrders(await fetchDisplayOrders(currentToken));
      } else {
        setOrders(await fetchOrders(currentToken));
      }
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : "Failed to load board.");
    } finally {
      setBoardLoading(false);
    }
  }

  async function loadDetail(orderId: number) {
    if (!session) {
      return;
    }

    setSelectedOrderId(orderId);
    setDetailLoading(true);
    setDetailError(null);
    setCommandError(null);
    try {
      setOrderDetail(await fetchOrderDetail(session.accessToken, orderId));
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Failed to load order.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function onItemCommand(itemId: string, command: ItemCommand) {
    if (!session || !selectedOrderId) {
      return;
    }

    setCommandLoading(itemId);
    setCommandError(null);
    try {
      await sendItemCommand(session.accessToken, itemId, command, {});
      await loadDetail(selectedOrderId);
      await loadBoard(session.accessToken, session.mode as "interactive" | "display");
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : "Command failed.");
    } finally {
      setCommandLoading(null);
    }
  }

  const isBoardView = view === "interactive_board" || view === "display_board";

  useEffect(() => {
    if (!isBoardView || !session) {
      return;
    }

    const mode = session.mode as "interactive" | "display";
    void loadBoard(session.accessToken, mode);
    const interval = setInterval(() => {
      void loadBoard(session.accessToken, mode);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isBoardView, session?.accessToken]);

  const isDisplay = view === "display_board";
  const currentOrders: (ProductionOrder | DisplayOrder)[] = isDisplay ? displayOrders : orders;
  const hasOrders = currentOrders.length > 0;
  const dashboardLabel = isBoardView ? "Dashboard" : "Login";

  const navigationItems: AppNavigationMenuItem[] = [
    {
      id: "dashboard",
      label: dashboardLabel,
      active: activeTab === "dashboard",
      onClick: () => {
        setActiveTab("dashboard");
        if (!isBoardView && view !== "landing") {
          goBackToLanding();
        }
      },
    },
    {
      id: "settings",
      label: "Settings",
      active: activeTab === "settings",
      onClick: () => setActiveTab("settings"),
    },
  ];

  function renderModeSelection() {
    return (
      <section className="entry-shell" aria-label="authentication" data-testid="auth-gate">
        <div className="entry-stack">
          <section className="entry-card" aria-label="mode selection" data-testid="mode-selection">
            <div className="mode-choice-grid">
              <ChoiceCard
                title="Interactive"
                description="Sign in with a staff account to manage the production board."
                tone="primary"
                onClick={() => setView("interactive_credentials")}
                testId="mode-interactive"
              />
              <ChoiceCard
                title="Display"
                description="Open the read-only board for kitchen and service displays."
                tone="secondary"
                onClick={() => {
                  setDisplayError(null);
                  setView("display_loading");
                }}
                testId="mode-display"
              />
            </div>
          </section>
          <LocalAccessQR hidden={isMobileViewport} />
        </div>
      </section>
    );
  }

  function renderCredentials() {
    return (
      <section className="entry-shell" aria-label="authentication" data-testid="auth-gate">
        <div className="entry-card auth-card">
          <InfoCard title="Staff Sign In" description="Use your staff credentials to access the interactive production board.">
            <form className="auth-form" onSubmit={onLogin}>
              <FormTextField
                label="Login"
                value={loginValue}
                onChange={(event) => setLoginValue(event.target.value)}
                autoComplete="username"
                required
              />
              <FormTextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <div className="auth-form-actions">
                <ActionButton tone="neutral" variant="outlined" type="button" onClick={goBackToLanding}>
                  Back
                </ActionButton>
                <ActionButton type="submit" disabled={authLoading}>
                  {authLoading ? "Signing in..." : "Sign In"}
                </ActionButton>
              </div>
            </form>
            {authError ? <p className="error-text">{authError}</p> : null}
          </InfoCard>
        </div>
      </section>
    );
  }

  function renderDisplayLoading() {
    return (
      <section className="entry-shell">
        <div className="entry-card">
          <InfoCard
            title="Connecting display mode"
            description="Requesting the application token for the display board."
          >
            <div data-testid="display-loading">
              <p className="muted">Connecting display mode...</p>
            </div>
            {displayError ? (
              <>
                <p className="error-text">{displayError}</p>
                <ActionButton type="button" onClick={goBackToLanding}>
                  Back
                </ActionButton>
              </>
            ) : null}
          </InfoCard>
        </div>
      </section>
    );
  }

  function renderSettingsView() {
    return (
      <section className="settings-view" aria-label="settings">
        <InfoCard title="Settings" description="Shared UI controls for readability and device setup.">
          <TextSizeControl value={textSize} onChange={setTextSize} />
          {!isBoardView ? (
            <p className="muted">Choose a workspace mode from the dashboard when you are ready.</p>
          ) : (
            <p className="muted">
              These controls use the same shared components that will be reused across other web apps.
            </p>
          )}
        </InfoCard>
      </section>
    );
  }

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
          <span>
            {label.toUpperCase()} ({laneOrders.length})
          </span>
          <span className="lane-toggle-indicator" aria-hidden="true">
            {collapsed ? "▶" : "▼"}
          </span>
        </button>

        {!collapsed
          ? laneOrders.map((order) => {
              const badge = <StatusBadge label={statusLabel(order.Status)} tone={statusTone(order.Status)} />;

              if (isDisplay) {
                return (
                  <div key={order.OrderID} className="order-card" data-testid={`order-${order.OrderID}`}>
                    <div className="order-card-header">
                      <strong>Order #{order.OrderID}</strong>
                      {badge}
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
                    {badge}
                  </div>
                  <p className="muted">{productionOrder.UserDisplayName ?? `User #${productionOrder.UserID}`}</p>
                  {renderEmojiSummary(order.ItemStatusCounts)}
                  <p className="muted">{formatTime(order.CreatedAt)}</p>
                </button>
              );
            })
          : null}
      </section>
    );
  }

  function renderInteractiveDetail() {
    if (selectedOrderId === null) {
      return (
        <section className="detail-panel" aria-label="order detail" data-testid="order-detail">
          <InfoCard title="Order detail" description="Select an order from a lane to inspect items and commands.">
            <p className="muted">Select an order to view details.</p>
          </InfoCard>
        </section>
      );
    }

    if (detailLoading) {
      return (
        <section className="detail-panel" aria-label="order detail" data-testid="order-detail">
          <InfoCard title="Order detail" description="Loading the latest production information.">
            <p className="muted">Loading order detail...</p>
          </InfoCard>
        </section>
      );
    }

    if (detailError) {
      return (
        <section className="detail-panel" aria-label="order detail" data-testid="order-detail">
          <InfoCard title="Order detail" description="The detail request failed.">
            <p className="error-text">{detailError}</p>
          </InfoCard>
        </section>
      );
    }

    if (!orderDetail) {
      return null;
    }

    return (
      <section className="detail-panel" aria-label="order detail" data-testid="order-detail">
        <InfoCard
          title={`Order #${orderDetail.order.OrderID}`}
          description={`Customer: ${orderDetail.order.UserDisplayName ?? `User #${orderDetail.order.UserID}`}`}
        >
          <div className="detail-header">
            <StatusBadge label={statusLabel(orderDetail.order.Status)} tone={statusTone(orderDetail.order.Status)} />
          </div>
          {commandError ? <p className="error-text">{commandError}</p> : null}
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
                    <StatusBadge label={statusLabel(item.Status)} tone={statusTone(item.Status)} />
                    {item.ClaimedByDisplayName ? (
                      <span className="muted">Picked by: {item.ClaimedByDisplayName}</span>
                    ) : null}
                    {item.BlockedReason ? (
                      <span className="muted blocked-reason">Reason: {item.BlockedReason}</span>
                    ) : null}
                  </div>
                  <div className="item-actions">
                    {actions.map((command) => (
                      <ActionButton
                        key={command}
                        type="button"
                        size="small"
                        variant={command === "block" ? "outlined" : "contained"}
                        tone={command === "block" ? "secondary" : "primary"}
                        disabled={isLoading}
                        onClick={() => void onItemCommand(item.ID, command)}
                        data-testid={`${command}-${item.ID}`}
                      >
                        {command.charAt(0).toUpperCase() + command.slice(1)}
                      </ActionButton>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </InfoCard>
      </section>
    );
  }

  function renderBoardView() {
    return (
      <>
        <div className="app-toolbar">
          <div className="toolbar-left" />
          <div className="toolbar-right">
            {session ? (
              <span data-testid="mode-chip">
                <StatusBadge label={`Mode: ${session.mode}`} tone="info" />
              </span>
            ) : null}
            {!isDisplay && session?.user ? (
              <span className="auth-info" data-testid="auth-status">
                Signed in as <strong>{displayUserName(session.user)}</strong>
              </span>
            ) : null}
            <ActionButton
              tone="neutral"
              variant="outlined"
              type="button"
              onClick={() => session && void loadBoard(session.accessToken, session.mode as "interactive" | "display")}
              disabled={boardLoading}
              aria-label="Refresh"
            >
              Refresh
            </ActionButton>
          </div>
        </div>

        {boardLoading && !hasOrders ? <p className="muted">Loading orders...</p> : null}
        {boardError ? <p className="error-text">{boardError}</p> : null}

        {isDisplay ? (
          <div className="board-lanes" data-testid="order-list">
            {LANE_DEFINITIONS.map(({ status, label }) =>
              renderLane(status, label, sortOrdersForLane(currentOrders, status)),
            )}
          </div>
        ) : (
          <div className="board-lanes-with-detail" data-testid="order-list">
            {LANE_DEFINITIONS.map(({ status, label }) =>
              renderLane(status, label, sortOrdersForLane(orders, status)),
            )}
            {renderInteractiveDetail()}
          </div>
        )}

        {!boardLoading && !hasOrders && !boardError ? <p className="muted">No production orders.</p> : null}
      </>
    );
  }

  function renderDashboardContent() {
    switch (view) {
      case "landing":
        return renderModeSelection();
      case "interactive_credentials":
        return renderCredentials();
      case "display_loading":
        return renderDisplayLoading();
      default:
        return renderBoardView();
    }
  }

  return (
    <AppShell
      appTitle="Staff Client"
      headerEyebrow="Agentic Restaurant"
      navigationContentClassName="app-nav"
      navigation={
        <AppNavigationMenu
          title="Staff Client"
          subtitle={isBoardView ? (isDisplay ? "Display workspace" : "Kitchen workspace") : "Entry workspace"}
          items={navigationItems}
          footer={
            isBoardView ? (
              <>
                <TextSizeControl value={textSize} onChange={setTextSize} testId="text-size-controls" />
                <ActionButton
                  tone="neutral"
                  variant="outlined"
                  type="button"
                  onClick={resetAllState}
                  aria-label={isDisplay ? "Exit" : "Logout"}
                  title={isDisplay ? "Exit" : "Logout"}
                >
                  {isDisplay ? "Exit" : "Logout"}
                </ActionButton>
              </>
            ) : undefined
          }
        />
      }
    >
      {activeTab === "settings" ? renderSettingsView() : renderDashboardContent()}
    </AppShell>
  );
}
