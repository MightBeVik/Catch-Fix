import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { fetchDashboard, fetchEvaluations, runEvaluation } from "../api/monitoring";

export function MonitoringPage() {
  const { canEdit, meta } = useOutletContext();
  const [dashboard, setDashboard] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [status, setStatus] = useState("");

  const serviceNameById = Object.fromEntries((dashboard?.services || []).map((service) => [service.id, service.name]));
  const anthropicReady = Boolean(meta?.runtime?.anthropic_configured);

  async function load() {
    const [dashboardData, evaluationsData] = await Promise.all([fetchDashboard(), fetchEvaluations()]);
    setDashboard(dashboardData);
    setEvaluations(evaluationsData.items || []);
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
  }, []);

  async function handleRun(serviceId) {
    try {
      const result = await runEvaluation(serviceId);
      setStatus(`Evaluation finished with score ${result.quality_score}.`);
      await load();
    } catch (error) {
      setStatus(error.message);
    }
  }

  const driftedServices = (dashboard?.services || []).filter((service) => service.drift_flagged);
  const avgQuality = Number(dashboard?.stats.avg_quality_score ?? 0);

  function getServiceStatus(service) {
    const metric = service.latest_metric;
    if (!metric) {
      return { label: "Unknown", badgeClass: "status-badge status-badge--neutral", dotClass: "status-dot", tone: "blue" };
    }
    if (service.drift_flagged || metric.error_rate >= 50 || metric.quality_score < 70) {
      return { label: "Critical", badgeClass: "status-badge status-badge--critical", dotClass: "status-dot status-dot--critical", tone: "red" };
    }
    if (metric.quality_score < 90 || metric.error_rate > 0) {
      return { label: "Warning", badgeClass: "status-badge status-badge--warning", dotClass: "status-dot status-dot--warning", tone: "yellow" };
    }
    return { label: "Healthy", badgeClass: "status-badge status-badge--healthy", dotClass: "status-dot status-dot--live", tone: "green" };
  }

  function metricTone(value, thresholds) {
    if (value >= thresholds.good) {
      return "green";
    }
    if (value >= thresholds.warn) {
      return "yellow";
    }
    return "red";
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h3 className="page-title">Monitoring Dashboard</h3>
          <p className="page-description">
          Latest metrics, drift threshold tracking, manual evaluation runs, and stored evaluation outputs per service.
          </p>
        </div>
      </div>

      {driftedServices.length ? (
        <div className="callout callout--danger">
          <span className="status-dot status-dot--critical" />
          <div>
            <p className="field-label">Quality Drift Detected</p>
            <div className="section-copy" style={{ marginTop: 4 }}>
              Quality drift detected on {driftedServices.map((service) => service.name).join(", ")}.
            </div>
          </div>
        </div>
      ) : null}

      <div className="metric-grid">
        <div className="metric-card metric-card--blue">
          <p className="metric-label">Services</p>
          <div className="metric-value">{dashboard?.stats.total_services ?? 0}</div>
          <div className="metric-subvalue">Registered AI services under active observation</div>
        </div>
        <div className={`metric-card metric-card--${avgQuality >= 90 ? "green" : avgQuality >= 70 ? "yellow" : "red"}`}>
          <p className="metric-label">Average Quality</p>
          <div className="metric-value">{dashboard?.stats.avg_quality_score ?? "--"}</div>
          <div className="metric-subvalue">Across the most recent stored evaluations</div>
        </div>
        <div className={`metric-card metric-card--${dashboard?.stats.drift_services ? "red" : "green"}`}>
          <p className="metric-label">Drift Flags</p>
          <div className="metric-value">{dashboard?.stats.drift_services ?? 0}</div>
          <div className="metric-subvalue">Services currently below the quality threshold</div>
        </div>
        <div className="metric-card metric-card--blue">
          <p className="metric-label">Threshold</p>
          <div className="metric-value">{dashboard?.threshold ?? 70}</div>
          <div className="metric-subvalue">Minimum acceptable composite quality score</div>
        </div>
      </div>

      <div className="panel-sharp">
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th>Quality</th>
              <th>Latency</th>
              <th>Error Rate</th>
              <th>Last Evaluated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(dashboard?.services || []).map((service) => {
              const serviceStatus = getServiceStatus(service);
              return (
                <tr key={service.id}>
                  <td>
                    <Link className="mono" style={{ color: "var(--text-primary)", fontWeight: 600 }} to={`/registry/${service.id}`}>
                      {service.name}
                    </Link>
                    <div className="muted" style={{ marginTop: 4 }}>{service.owner}</div>
                  </td>
                  <td>
                    <span className={serviceStatus.badgeClass}>
                      <span className={serviceStatus.dotClass} />
                      {serviceStatus.label}
                    </span>
                  </td>
                  <td className="mono">{service.latest_metric?.quality_score ?? "--"}</td>
                  <td className="mono">{service.latest_metric?.latency_ms ? `${service.latest_metric.latency_ms}ms` : "--"}</td>
                  <td className="mono">{service.latest_metric?.error_rate !== undefined ? `${service.latest_metric.error_rate}%` : "--"}</td>
                  <td className="mono">{service.latest_metric?.timestamp ?? "Never"}</td>
                  <td>
                    <button
                      className="button button-primary"
                      disabled={!canEdit || !anthropicReady}
                      onClick={() => handleRun(service.id)}
                      title={anthropicReady ? "" : "Set ANTHROPIC_API_KEY in server/.env to enable evaluations."}
                      type="button"
                    >
                      Run evaluation
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel-sharp">
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Category</th>
              <th>Score</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((evaluation) => (
              <tr key={evaluation.id}>
                <td>
                  <Link className="mono" style={{ color: "var(--text-primary)", fontWeight: 600 }} to={`/registry/${evaluation.service_id}`}>
                    {serviceNameById[evaluation.service_id] || `Service #${evaluation.service_id}`}
                  </Link>
                </td>
                <td>{evaluation.category}</td>
                <td>
                  <span className={`status-badge status-badge--${metricTone(evaluation.score, { good: 90, warn: 70 }) === "green" ? "healthy" : metricTone(evaluation.score, { good: 90, warn: 70 }) === "yellow" ? "warning" : "critical"}`}>
                    {evaluation.score}
                  </span>
                </td>
                <td className="mono">{evaluation.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {status ? <div className="status-message">{status}</div> : null}
    </section>
  );
}