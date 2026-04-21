import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { fetchMeta } from "../api/client";
import { DEMO_ROLES, canEdit } from "../lib/roles";

const navItems = [
  { to: "/registry", label: "Registry" },
  { to: "/monitoring", label: "Monitoring" },
  { to: "/incidents", label: "Incidents" },
  { to: "/maintenance", label: "Maintenance" },
  { to: "/governance", label: "Governance" },
];

export function AppLayout({ role, setRole, theme, setTheme }) {
  const [meta, setMeta] = useState(null);
  const supportedProviders = meta?.runtime?.supported_providers || [];

  useEffect(() => {
    fetchMeta().then(setMeta).catch(() => setMeta(null));
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <p className="brand-mark">Catch-Fix</p>
          <h1 className="brand-title">AI Operations Control Room</h1>
          <p className="brand-copy">
              React client with simulated auth, governance-aware workflows, and backend-only multi-provider LLM routing.
          </p>
        </div>

        <div className="sidebar-section">
          <div className="field-label">Role Context</div>
          <div className="brand-copy" style={{ marginTop: 8 }}>
            {canEdit(role)
              ? "This role can create and update operational records."
              : "This role is read-only and cannot save changes."}
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => ["nav-link", isActive ? "active" : ""].join(" ").trim()}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div className="topbar-title-group">
            <p className="topbar-subtitle">ARTI-409-A Mission Control</p>
            <h2 className="topbar-title">Govern, monitor, and maintain AI services</h2>
          </div>

          <div className="topbar-actions">
            <label className="theme-switcher">
              <span className="field-label">Theme</span>
              <div aria-label="Theme mode" className="theme-toggle" role="group">
                <button
                  className={["theme-toggle-button", theme === "dark" ? "active" : ""].join(" ").trim()}
                  onClick={() => setTheme("dark")}
                  type="button"
                >
                  Dark
                </button>
                <button
                  className={["theme-toggle-button", theme === "light" ? "active" : ""].join(" ").trim()}
                  onClick={() => setTheme("light")}
                  type="button"
                >
                  Light
                </button>
              </div>
            </label>

            <div className="connection-chip">
              <span className={["status-dot", supportedProviders.length ? "status-dot--live" : "status-dot--critical"].join(" ")} />
              <span>{supportedProviders.length ? "Local + cloud adapters" : "No adapters loaded"}</span>
            </div>

            <label className="role-switcher">
              <span className="field-label">Role</span>
              <select
                className="select"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                {DEMO_ROLES.map((demoRole) => (
                  <option key={demoRole} value={demoRole}>
                    {demoRole}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <main className="content-wrap">
          {meta ? (
            <div className="callout callout--warning">
              <span className="status-dot status-dot--warning" />
              <div>
                <div className="field-label">Runtime Notice</div>
                <div className="section-copy" style={{ marginTop: 4 }}>
                  Cloud providers use server-side env vars. LM Studio and Ollama can run without API keys if their local endpoints are reachable.
                </div>
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: meta ? 24 : 0 }}>
            <Outlet context={{ role, canEdit: canEdit(role), meta }} />
          </div>
        </main>
      </div>
    </div>
  );
}