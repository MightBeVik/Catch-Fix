import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { fetchIncidents } from "../api/incidents";
import { apiRequest } from "../api/client";
import { fetchDashboard } from "../api/monitoring";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function qualityColor(score) {
  if (score === null || score === undefined) return "status-dot--neutral";
  if (score >= 80) return "status-dot--live";
  if (score >= 60) return "status-dot--warning";
  return "status-dot--critical";
}

function severityClass(severity) {
  return { low: "status-badge--info", medium: "status-badge--warning", high: "status-badge--critical", critical: "status-badge--critical" }[severity] || "status-badge--neutral";
}

function StatTile({ label, value, sub, accent }) {
  const accentColors = {
    blue: "var(--accent-blue)",
    green: "var(--status-green)",
    yellow: "var(--status-yellow)",
    red: "var(--status-red)",
  };
  return (
    <div className="panel" style={{ borderTop: `3px solid ${accentColors[accent] || accentColors.blue}`, padding: "20px 22px" }}>
      <p className="field-label">{label}</p>
      <p style={{ margin: "10px 0 0", fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 700, color: "var(--text-primary)" }}>{value}</p>
      {sub && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { user, role } = useOutletContext();
  const [dashboard, setDashboard] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchDashboard(),
      fetchIncidents(),
      apiRequest("/governance/runtime-status"),
    ])
      .then(([dash, inc, gov]) => {
        setDashboard({ ...dash, scheduler: gov.scheduler, counts: gov.counts, runtime: gov.runtime });
        setIncidents(inc.items || []);
      })
      .catch((err) => setStatus(err.message))
      .finally(() => setLoading(false));
  }, []);

  const openIncidents = incidents.filter((i) => !i.approved);
  const driftCount = dashboard?.stats?.drift_services ?? 0;
  const avgQuality = dashboard?.stats?.avg_quality_score;
  const serviceCount = dashboard?.counts?.services ?? dashboard?.services?.length ?? 0;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ alignItems: "center" }}>
        <div>
          <p className="eyebrow">Operations Dashboard</p>
          <h2 className="page-title" style={{ marginTop: 6 }}>
            {greeting()}, {user?.username ?? role}
          </h2>
          <p className="page-description" style={{ marginTop: 4 }}>
            {new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="button-row">
          <Link className="button button-secondary" to="/monitoring">Monitoring</Link>
          <Link className="button button-primary" to="/incidents">View Incidents</Link>
        </div>
      </div>

      {status && (
        <div className="callout callout--danger" style={{ padding: "10px 14px" }}>{status}</div>
      )}

      {loading ? (
        <div className="status-message">Loading dashboard…</div>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="metric-grid">
            <StatTile
              label="Registered Services"
              value={serviceCount}
              sub="across all environments"
              accent="blue"
            />
            <StatTile
              label="Avg Quality Score"
              value={avgQuality != null ? `${avgQuality.toFixed(1)}%` : "—"}
              sub={`threshold: ${dashboard?.runtime?.drift_threshold ?? 70}%`}
              accent={avgQuality >= 80 ? "green" : avgQuality >= 60 ? "yellow" : "red"}
            />
            <StatTile
              label="Open Incidents"
              value={openIncidents.length}
              sub={`${incidents.length} total`}
              accent={openIncidents.length === 0 ? "green" : openIncidents.length <= 2 ? "yellow" : "red"}
            />
            <StatTile
              label="Drift Alerts"
              value={driftCount}
              sub="services below threshold"
              accent={driftCount === 0 ? "green" : "red"}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Service health */}
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="section-title" style={{ fontSize: 15 }}>Service Health</h3>
                <Link to="/monitoring" style={{ fontSize: 12, color: "var(--accent-blue)" }}>View all →</Link>
              </div>
              {(dashboard?.services || []).length === 0 ? (
                <div style={{ padding: "20px", color: "var(--text-secondary)", fontSize: 13 }}>No services registered.</div>
              ) : (
                <div>
                  {(dashboard?.services || []).map((svc) => {
                    const score = svc.latest_metric?.quality_score ?? null;
                    return (
                      <Link
                        key={svc.id}
                        to={`/registry/${svc.id}`}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border)", textDecoration: "none", transition: "background 150ms" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}
                      >
                        <span className={`status-dot ${qualityColor(score)}`} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{svc.name}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{svc.environment} · {svc.provider_type}</p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                            {score != null ? `${score}%` : "—"}
                          </p>
                          {svc.drift_flagged && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--status-yellow)", textTransform: "uppercase", letterSpacing: "0.06em" }}>drift</span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent incidents */}
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="section-title" style={{ fontSize: 15 }}>Recent Incidents</h3>
                <Link to="/incidents" style={{ fontSize: 12, color: "var(--accent-blue)" }}>View all →</Link>
              </div>
              {incidents.length === 0 ? (
                <div style={{ padding: "20px", color: "var(--text-secondary)", fontSize: 13 }}>No incidents recorded.</div>
              ) : (
                <div>
                  {incidents.slice(0, 5).map((inc) => (
                    <div key={inc.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                      <span className={`status-badge ${severityClass(inc.severity)}`} style={{ marginTop: 2, flexShrink: 0 }}>{inc.severity}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inc.service_name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inc.symptoms}</p>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                        {inc.approved ? (
                          <span style={{ color: "var(--status-green)" }}>resolved</span>
                        ) : (
                          <span style={{ color: "var(--status-yellow)" }}>open</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System status bar */}
          <div className="panel" style={{ padding: "16px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
              <div>
                <p className="field-label" style={{ marginBottom: 6 }}>Scheduler</p>
                <div className="status-banner-inline">
                  <span className={`status-dot ${dashboard?.scheduler?.running ? "status-dot--live" : dashboard?.scheduler?.enabled ? "status-dot--warning" : "status-dot--critical"}`} />
                  <span style={{ fontSize: 13 }}>{dashboard?.scheduler?.running ? "Running" : dashboard?.scheduler?.enabled ? "Idle" : "Stopped"}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· {dashboard?.scheduler?.schedule}</span>
                </div>
              </div>

              <div style={{ width: 1, height: 32, background: "var(--border)" }} />

              <div>
                <p className="field-label" style={{ marginBottom: 6 }}>Providers</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(dashboard?.runtime?.supported_providers || []).map((p) => (
                    <span key={p.id} className="status-badge status-badge--info" style={{ fontSize: 11 }}>{p.name}</span>
                  ))}
                </div>
              </div>

              <div style={{ width: 1, height: 32, background: "var(--border)" }} />

              <div>
                <p className="field-label" style={{ marginBottom: 6 }}>API Keys</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {Object.entries(dashboard?.runtime?.secrets || {}).map(([key, set]) => (
                    <span key={key} className={`status-badge ${set ? "status-badge--healthy" : "status-badge--neutral"}`} style={{ fontSize: 11 }}>
                      {key.replace("_API_KEY", "")} {set ? "✓" : "—"}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginLeft: "auto" }}>
                <p className="field-label" style={{ marginBottom: 6 }}>Last Eval Run</p>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                  {dashboard?.scheduler?.last_run_completed_at
                    ? new Date(dashboard.scheduler.last_run_completed_at).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
