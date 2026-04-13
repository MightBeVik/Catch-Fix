const navItems = [
  { path: "/", label: "Dashboard" },
  { path: "/registry", label: "Registry" },
  { path: "/service-detail", label: "Service Detail" },
  { path: "/incidents", label: "Incidents" },
  { path: "/maintenance", label: "Maintenance" },
  { path: "/governance", label: "Governance" },
];

export default function AppShell({ activePath, content }) {
  const activeLabel = navItems.find((item) => item.path === activePath)?.label ?? "Dashboard";

  const navigateTo = (path) => {
    if (window.location.pathname === path) {
      return;
    }
    window.history.pushState({}, "", path);
    window.location.assign(path);
  };

  return (
    <div className="app-layout">
      <div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 9999,
          padding: "10px 14px",
          borderRadius: 10,
          background: "#0b1120",
          color: "#e8ecf4",
          border: "1px solid #2a3f6a",
          boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        FRONTEND LIVE
      </div>

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">C</div>
            <div className="sidebar-logo-text">
              <h1>Catch-Fix</h1>
              <span>Axiom Sentinel Ops</span>
            </div>
          </div>
        </div>

        <div className="sidebar-cta">
          <button className="btn btn-primary module-button">Module Workspace Ready</button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigateTo(item.path)}
              className={`nav-item ${activePath === item.path ? "active" : ""}`.trim()}
            >
              <span className="nav-icon nav-dot" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item static-item">
            <span className="nav-icon nav-dot" />
            Module Split Enabled
          </div>
          <div className="nav-item static-item">
            <span className="nav-icon nav-dot" />
            Branch Flow: main / develop
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-brand">Catch-Fix Control Room</span>
            <nav className="topbar-nav">
              <span className="active">{activeLabel}</span>
              <span>Ownership Plan In Repo</span>
              <span>Git Workflow In Repo</span>
            </nav>
          </div>
          <div className="topbar-right">
            <div className="topbar-search">
              <input type="text" placeholder="Search parameters..." readOnly />
            </div>
            <button className="btn btn-outline btn-sm">Develop</button>
            <button className="btn btn-primary btn-sm">Integration Ready</button>
          </div>
        </header>

        <div className="page-content">{content}</div>
      </main>
    </div>
  );
}