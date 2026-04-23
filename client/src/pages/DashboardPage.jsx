import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { fetchIncidents } from "../api/incidents";
import { apiRequest } from "../api/client";
import { fetchDashboard } from "../api/monitoring";
import { formatMDT } from "../lib/time";

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
  const accentColors = { blue: "var(--accent-blue)", green: "var(--status-green)", yellow: "var(--status-yellow)", red: "var(--status-red)" };
  return (
    <div className="panel" style={{ borderTop: `3px solid ${accentColors[accent] || accentColors.blue}`, padding: "20px 22px" }}>
      <p className="field-label">{label}</p>
      <p style={{ margin: "10px 0 0", fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 700, color: "var(--text-primary)" }}>{value}</p>
      {sub && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}

function useCountdown(cronSchedule) {
  const [countdown, setCountdown] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!cronSchedule) return;

    // Parse interval minutes from cron like "*/30 * * * *" or "*/5 * * * *"
    const match = cronSchedule.match(/^\*\/(\d+)\s/);
    const intervalMins = match ? parseInt(match[1], 10) : 30;

    function compute() {
      const now = new Date();
      const mins = now.getMinutes();
      const secs = now.getSeconds();
      const totalSecs = mins * 60 + secs;
      const intervalSecs = intervalMins * 60;
      const secsUntilNext = intervalSecs - (totalSecs % intervalSecs);
      const m = Math.floor(secsUntilNext / 60).toString().padStart(2, "0");
      const s = (secsUntilNext % 60).toString().padStart(2, "0");
      setCountdown(`${m}:${s}`);
    }

    compute();
    intervalRef.current = setInterval(compute, 1000);
    return () => clearInterval(intervalRef.current);
  }, [cronSchedule]);

  return countdown;
}

const CHECKLIST_LABELS = {
  data_issue: "Data Issue",
  prompt_change: "Prompt Change",
  model_update: "Model Update",
  infrastructure_problem: "Infrastructure Problem",
  safety_policy_failure: "Safety Policy Failure",
};

export function DashboardPage() {
  const { user, role } = useOutletContext();
  const [dashboard, setDashboard] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);

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

  const countdown = useCountdown(dashboard?.scheduler?.schedule);

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

      {status && <div className="callout callout--danger" style={{ padding: "10px 14px" }}>{status}</div>}

      {loading ? (
        <div className="status-message">Loading dashboard…</div>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="metric-grid">
            <StatTile label="Registered Services" value={serviceCount} sub="across all environments" accent="blue" />
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
                          {svc.drift_flagged && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--status-yellow)", textTransform: "uppercase", letterSpacing: "0.06em" }}>drift</span>}
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
                    <div key={inc.id}>
                      {/* Incident row */}
                      <button
                        type="button"
                        onClick={() => setSelectedIncident(selectedIncident?.id === inc.id ? null : inc)}
                        style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border)", background: selectedIncident?.id === inc.id ? "var(--bg-elevated)" : "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background 150ms" }}
                        onMouseEnter={e => { if (selectedIncident?.id !== inc.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
                        onMouseLeave={e => { if (selectedIncident?.id !== inc.id) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span className={`status-badge ${severityClass(inc.severity)}`} style={{ marginTop: 2, flexShrink: 0 }}>{inc.severity}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inc.service_name}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inc.symptoms}</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: inc.resolved ? "var(--text-secondary)" : inc.approved ? "var(--status-green)" : "var(--status-yellow)" }}>
                            {inc.resolved ? "resolved" : inc.approved ? "approved" : "open"}
                          </span>
                          <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{selectedIncident?.id === inc.id ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {/* Expanded detail card */}
                      {selectedIncident?.id === inc.id && (
                        <div style={{ padding: "16px 20px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", borderLeft: `3px solid ${inc.severity === "critical" || inc.severity === "high" ? "var(--status-red)" : inc.severity === "medium" ? "var(--status-yellow)" : "var(--border)"}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{inc.service_name}</p>
                              <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>{formatMDT(inc.created_at)}</p>
                            </div>
                            <Link to="/incidents" style={{ fontSize: 12, color: "var(--accent-blue)", flexShrink: 0 }}>Open in Incidents →</Link>
                          </div>

                          <div style={{ display: "grid", gap: 10 }}>
                            <div>
                              <p className="field-label" style={{ fontSize: 11, marginBottom: 3 }}>Symptoms</p>
                              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{inc.symptoms}</p>
                            </div>
                            <div>
                              <p className="field-label" style={{ fontSize: 11, marginBottom: 3 }}>Timeline</p>
                              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{inc.timeline}</p>
                            </div>

                            {/* Checklist */}
                            <div>
                              <p className="field-label" style={{ fontSize: 11, marginBottom: 6 }}>Checklist</p>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {Object.entries(inc.checklist_json || {}).map(([key, val]) => (
                                  <span key={key} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: val ? "var(--status-red-bg, rgba(239,68,68,0.1))" : "var(--bg-elevated)", color: val ? "var(--status-red)" : "var(--text-secondary)", border: `1px solid ${val ? "var(--status-red)" : "var(--border)"}` }}>
                                    {val ? "✓" : "–"} {CHECKLIST_LABELS[key] || key}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Summary */}
                            {inc.llm_summary && (
                              <div>
                                <p className="field-label" style={{ fontSize: 11, marginBottom: 3 }}>AI Summary</p>
                                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{inc.llm_summary}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`status-dot ${dashboard?.scheduler?.running ? "status-dot--live" : dashboard?.scheduler?.enabled ? "status-dot--warning" : "status-dot--critical"}`} />
                  <span style={{ fontSize: 13 }}>{dashboard?.scheduler?.running ? "Running" : dashboard?.scheduler?.enabled ? "Idle" : "Stopped"}</span>
                  {!dashboard?.scheduler?.running && countdown && (
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--accent-blue)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 7px" }}>
                      next in {countdown}
                    </span>
                  )}
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
                  {dashboard?.scheduler?.last_run_completed_at ? formatMDT(dashboard.scheduler.last_run_completed_at) : "Never"}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
