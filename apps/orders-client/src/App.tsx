import { Link, Route, Routes } from "react-router-dom";
import { serviceBaseUrls } from "./shared/api/config";

function ShellSection({ title, description }: { title: string; description: string }) {
  return (
    <section className="surface-card">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

function Home() {
  return (
    <div className="layout-grid" data-testid="home-shell">
      <ShellSection
        title="Authentication"
        description="Login flow UI hooks will be implemented in the auth feature module."
      />
      <ShellSection
        title="Menu + Basket"
        description="Catalog and basket state will be added in dedicated feature slices."
      />
      <ShellSection
        title="Order Submission"
        description="Checkout and confirmation experiences will live under orders feature routes."
      />
    </div>
  );
}

export function App() {
  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Restaurant Platform</p>
          <h1>Orders Client</h1>
          <p className="subtitle">
            Responsive shell initialized for login, menu browsing, basket, and order workflows.
          </p>
        </div>
        <nav className="nav-links" aria-label="Primary">
          <Link to="/">Home</Link>
          <Link to="/auth">Auth</Link>
          <Link to="/menu">Menu</Link>
          <Link to="/orders">Orders</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<ShellSection title="Auth Route" description="Feature stub." />} />
          <Route path="/menu" element={<ShellSection title="Menu Route" description="Feature stub." />} />
          <Route path="/orders" element={<ShellSection title="Orders Route" description="Feature stub." />} />
        </Routes>
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
