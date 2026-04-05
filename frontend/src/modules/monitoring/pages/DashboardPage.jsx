import { useEffect, useState } from "react";
import { fetchDashboard, fetchEvalResults, runEval } from "../data/monitoringData";

function toneClass(tone) {
  if (tone === "good" || tone === "positive") return "good";
  if (tone === "warn" || tone === "warning") return "warn";
  return "neutral";
}

function ServiceCard({ service, onRunEval, isRunning }) {
  const { metrics } = service;
  const metricList = [
    { label: "Latency",    value: `${metrics.latency_ms}ms`, tone: metrics.latency_ms > 500 ? "warn" : "good" },
    { label: "Error Rate", value: `${metrics.error_rate}%`,  tone: metrics.error_rate > 1 ? "warn" : "good" },
    { label: "Quality",    value: `${metrics.quality_score}%`, tone: metrics.quality_score < 85 ? "warn" : "good" },
  ];

  return (
    <div className={`service-card animate-in ${service.drift_flagged ? "drift" : ""}`.trim()}>
      <div className="service-card-header">
        <div className="service-meta-row">
          <div className="service-card-icon">AI</div>
          <div>
            <div className="service-card-name">{service.name}</div>
            <div className="service-card-version">{service.version}</div>
          </div>
        </div>
        <span className={`badge ${service.badge}`}>{service.status}</span>
      </div>

      <div className="service-card-metrics">
        {metricList.map((m) => (
          <div className="metric" key={m.label}>
            <div className="metric-label">{m.label}</div>
            <div className={`metric-value ${toneClass(m.tone)}`}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="quality-trend">
        <div className="quality-trend-header">
          <span className="quality-trend-label">Quality Trend</span>
          <span className="quality-trend-status">{service.trend_status}</span>
        </div>
        <div className="trend-bars">
          {service.trend_bars.map((bar, i) => (
            <div
              key={i}
              className={`trend-bar ${bar > 84 ? "high" : bar < 58 ? "low" : "medium"}`}
              style={{ height: `${bar}%` }}
            />
          ))}
        </div>
      </div>

      {service.drift_flagged && (
        <div style={{
          marginTop: 10, padding: "6px 10px",
          background: "rgba(255,71,87,0.12)",
          border: "1px solid var(--accent-red)",
          borderRadius: 6, fontSize: 11,
          color: "var(--accent-red)", fontWeight: 600,
        }}>
          ⚠ DRIFT DETECTED — quality below threshold
        </div>
      )}

      <button
        className="btn btn-outline btn-sm"
        style={{ marginTop: 10, width: "100%" }}
        onClick={() => onRunEval(service.id)}
        disabled={isRunning}
      >
        {isRunning ? "Running Eval…" : "▶ Run Evaluation"}
      </button>
    </div>
  );
}

function EvalResultRow({ result }) {
  const time = new Date(result.evaluated_at).toLocaleTimeString();
  const date = new Date(result.evaluated_at).toLocaleDateString();

  return (
    <div className="feed-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 12 }}>
          {result.service_name}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{date} {time}</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: result.drift_flagged ? "var(--accent-red)" : "var(--accent-green)",
        }}>
          Score: {result.quality_score}%
        </span>
        {result.drift_flagged && (
          <span style={{ fontSize: 11, color: "var(--accent-red)" }}>⚠ Drift Flag</span>
        )}
        {result.checks.map((c) => (
          <span key={c.category} style={{
            fontSize: 10,
            color: c.passed ? "var(--accent-green-dim)" : "var(--accent-amber)",
            background: c.passed ? "rgba(0,230,118,0.08)" : "rgba(255,167,38,0.08)",
            padding: "1px 6px", borderRadius: 4,
          }}>
            {c.category === "formatting_correctness" ? "Formatting" : "PII Check"}:
            {c.passed ? " ✓" : " ✗"}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
        Triggered by: {result.triggered_by}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard]     = useState(null);
  const [evalResults, setEvalResults] = useState([]);
  const [runningId, setRunningId]     = useState(null);
  const [toast, setToast]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    loadDashboard();
    loadEvalResults();
  }, []);

  async function loadDashboard() {
    try {
      const data = await fetchDashboard();
      setDashboard(data);
    } catch {
      setError("Cannot reach backend. Is uvicorn running on port 8000?");
    } finally {
      setLoading(false);
    }
  }

  async function loadEvalResults() {
    try {
      const data = await fetchEvalResults();
      setEvalResults(data.results || []);
    } catch {
      // non-critical
    }
  }

  async function handleRunEval(serviceId) {
    setRunningId(serviceId);
    setToast(null);
    try {
      const result = await runEval(serviceId);
      await loadDashboard();
      await loadEvalResults();
      setToast({
        type: result.drift_flagged ? "warn" : "success",
        message: result.drift_flagged
          ? `⚠ Drift detected on ${result.service_name} — score: ${result.quality_score}%`
          : `✓ Eval complete — ${result.service_name} scored ${result.quality_score}%`,
      });
    } catch {
      setToast({ type: "error", message: "Eval run failed. Check backend." });
    } finally {
      setRunningId(null);
      setTimeout(() => setToast(null), 4000);
    }
  }

  if (loading) return <div style={{ padding: 40, color: "var(--text-secondary)" }}>Loading…</div>;

  if (error) return (
    <div style={{
      margin: 24, padding: 20,
      background: "rgba(255,71,87,0.1)",
      border: "1px solid var(--accent-red)",
      borderRadius: 10, color: "var(--accent-red)",
    }}>
      {error}
    </div>
  );

  const { stats, services } = dashboard;

  return (
    <>
      {toast && (
        <div style={{
          position: "fixed", top: 70, right: 16, zIndex: 9000,
          padding: "10px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13,
          background: toast.type === "success" ? "rgba(0,230,118,0.15)"
            : toast.type === "warn" ? "rgba(255,167,38,0.15)" : "rgba(255,71,87,0.15)",
          border: `1px solid ${toast.type === "success" ? "var(--accent-green)"
            : toast.type === "warn" ? "var(--accent-amber)" : "var(--accent-red)"}`,
          color: toast.type === "success" ? "var(--accent-green)"
            : toast.type === "warn" ? "var(--accent-amber)" : "var(--accent-red)",
        }}>
          {toast.message}
        </div>
      )}

      <div className="header-row">
        <div className="page-header">
          <h1 className="page-title">Monitoring Dashboard</h1>
          <p className="page-subtitle">Live metrics · Evaluation harness · Drift detection</p>
        </div>
        <div className="header-tags">
          <span className="network-tag">Drift Threshold: {dashboard.drift_threshold}%</span>
          <span className="live-sync">
            <span className="status-dot online pulse" />
            Live
          </span>
        </div>
      </div>

      <div className="stats-row">
        {stats.map((item) => (
          <div className="stat-card animate-in" key={item.label}>
            <div className="stat-label">{item.label}</div>
            <div className="stat-value">{item.value}</div>
            <div className={`stat-sub ${toneClass(item.tone)}`}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="section-header">
        <h2 className="section-title">AI Services</h2>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          {services.filter((s) => s.drift_flagged).length} drift alert(s)
        </span>
      </div>

      <div className="services-grid">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onRunEval={handleRunEval}
            isRunning={runningId === service.id}
          />
        ))}
      </div>

      <div className="bottom-panels">
        <div className="feed-card" style={{ flex: 2 }}>
          <div className="feed-header">
            <span className="feed-title">
              <span className="status-dot online pulse" />
              Evaluation Results
            </span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              {evalResults.length} run(s) stored
            </span>
          </div>
          {evalResults.length === 0 ? (
            <div style={{ padding: "20px 0", color: "var(--text-tertiary)", fontSize: 13 }}>
              No evaluations run yet. Click "Run Evaluation" on any service card above.
            </div>
          ) : (
            evalResults.map((r) => <EvalResultRow key={r.id} result={r} />)
          )}
        </div>

        <div className="snapshot-card">
          <div className="snapshot-title">Drift Threshold</div>
          <div className="compliance-gauge">
            <div className="gauge-circle">
              <span className="gauge-value">{dashboard.drift_threshold}</span>
            </div>
            <div className="gauge-label">Minimum Quality Score</div>
            <p className="gauge-note">
              Services below <strong>{dashboard.drift_threshold}%</strong> are flagged for drift review.
            </p>
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-secondary)" }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "var(--accent-green)" }}>●</span> Healthy:{" "}
              {services.filter((s) => !s.drift_flagged).length} services
            </div>
            <div>
              <span style={{ color: "var(--accent-red)" }}>●</span> Drift:{" "}
              {services.filter((s) => s.drift_flagged).length} services
            </div>
          </div>
        </div>
      </div>
    </>
  );
}