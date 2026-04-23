import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";

import { formatMDT } from "../lib/time";

import { fetchServiceOverview, testServiceConnection } from "../api/registry";

function EmptyState({ children }) {
  return <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">{children}</div>;
}

export function ServiceDetailPage() {
  const { canEdit } = useOutletContext();
  const { serviceId } = useParams();
  const [overview, setOverview] = useState(null);
  const [status, setStatus] = useState("");

  async function loadOverview() {
    const data = await fetchServiceOverview(serviceId);
    setOverview(data);
  }

  useEffect(() => {
    loadOverview().catch((error) => setStatus(error.message));
  }, [serviceId]);

  async function handleTestConnection() {
    try {
      const result = await testServiceConnection(serviceId, "Reply with a tiny JSON object containing a status key.");
      setStatus(`Connection result: ${result.test_result.status} in ${result.test_result.latency_ms} ms`);
      await loadOverview();
    } catch (error) {
      setStatus(error.message);
    }
  }

  function severityBadge(level) {
    if (level === "critical" || level === "high") {
      return "status-badge status-badge--critical";
    }
    if (level === "medium") {
      return "status-badge status-badge--warning";
    }
    return "status-badge status-badge--neutral";
  }

  if (!overview) {
    return (
      <section className="page">
        <Link className="button button-secondary" to="/registry">
          Back to registry
        </Link>
        {status ? <div className="status-message">{status}</div> : <EmptyState>Loading service overview...</EmptyState>}
      </section>
    );
  }

  const { service, summary, metrics, evaluations, incidents, maintenance_plans: maintenancePlans } = overview;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <Link className="button button-secondary" to="/registry">
            Back to registry
          </Link>
          <h3 className="page-title" style={{ marginTop: 16 }}>{service.name}</h3>
          <p className="page-description">
            Owner {service.owner} · {service.environment.toUpperCase()} · {service.provider_name || service.provider_type} · {service.model_name} · sensitivity {service.sensitivity}
          </p>
          <div className="badge-row" style={{ marginTop: 12 }}>
            <span className="status-badge status-badge--info">{service.provider_name || service.provider_type}</span>
            <span className="status-badge status-badge--info">{service.environment}</span>
            <span className="status-badge status-badge--neutral">{service.sensitivity}</span>
            <span className={`status-badge ${service.connection_ready ? "status-badge--healthy" : "status-badge--warning"}`}>{service.connection_ready ? "ready" : "needs config"}</span>
          </div>
          <div className="section-copy" style={{ marginTop: 12 }}>{service.connection_message}</div>
          <div className="mono" style={{ marginTop: 12 }}>{service.api_key_env_var || "No server auth env var configured"}</div>
          <div className="mono" style={{ marginTop: 12 }}>{service.api_endpoint}</div>
        </div>
        <button
          className="button button-secondary"
          disabled={!canEdit || !service.connection_ready}
          onClick={handleTestConnection}
          title={service.connection_ready ? "" : service.connection_message}
          type="button"
        >
          Test connection
        </button>
      </div>

      <div className="metric-grid">
        <div className={`metric-card metric-card--${summary.latest_quality_score >= 90 ? "green" : summary.latest_quality_score >= 70 ? "yellow" : "red"}`}>
          <div className="metric-label">Latest quality</div>
          <div className="metric-value">{summary.latest_quality_score ?? "--"}</div>
        </div>
        <div className="metric-card metric-card--blue">
          <div className="metric-label">Incidents</div>
          <div className="metric-value">{summary.incident_count}</div>
        </div>
        <div className="metric-card metric-card--green">
          <div className="metric-label">Approved incidents</div>
          <div className="metric-value">{summary.approved_incident_count}</div>
        </div>
        <div className="metric-card metric-card--yellow">
          <div className="metric-label">Pending maintenance</div>
          <div className="metric-value">{summary.pending_maintenance_count}</div>
        </div>
      </div>

      <div className="info-grid">
        <div className="panel">
          <h4 className="section-title">Recent metrics</h4>
          <div className="field-stack" style={{ marginTop: 16 }}>
            {metrics.length ? metrics.map((metric) => (
              <div className="panel-elevated" style={{ padding: "14px 16px" }} key={metric.id}>
                <div className="service-card-title" style={{ fontSize: 16 }}>Quality {metric.quality_score}</div>
                <div className="section-copy" style={{ marginTop: 6 }}>Latency {metric.latency_ms} ms · Error rate {metric.error_rate}%</div>
                <div className="mono" style={{ marginTop: 8 }}>{formatMDT(metric.timestamp)}</div>
              </div>
            )) : <EmptyState>No metrics stored yet. Run a monitoring evaluation to populate this service timeline.</EmptyState>}
          </div>
        </div>

        <div className="panel">
          <h4 className="section-title">Recent evaluations</h4>
          <div className="field-stack" style={{ marginTop: 16 }}>
            {evaluations.length ? evaluations.map((evaluation) => (
              <div className="panel-elevated" style={{ padding: "14px 16px" }} key={evaluation.id}>
                <div className="service-card-title" style={{ fontSize: 16 }}>{evaluation.category}</div>
                <div className="section-copy" style={{ marginTop: 6 }}>Score {evaluation.score}</div>
                <div className="mono" style={{ marginTop: 8 }}>{formatMDT(evaluation.timestamp)}</div>
              </div>
            )) : <EmptyState>No evaluation history yet.</EmptyState>}
          </div>
        </div>

        <div className="panel">
          <h4 className="section-title">Incidents</h4>
          <div className="field-stack" style={{ marginTop: 16 }}>
            {incidents.length ? incidents.map((incident) => (
              <div className="panel-elevated" style={{ padding: "14px 16px" }} key={incident.id}>
                <div className="section-row">
                  <span className={severityBadge(incident.severity)}>{incident.severity}</span>
                  <span className={`status-badge ${incident.approved ? "status-badge--healthy" : "status-badge--warning"}`}>{incident.approved ? "approved" : "draft"}</span>
                </div>
                <div className="section-copy" style={{ marginTop: 8 }}>{incident.symptoms}</div>
                <div className="mono" style={{ marginTop: 8 }}>Updated {formatMDT(incident.updated_at)}</div>
              </div>
            )) : <EmptyState>No incidents linked to this service.</EmptyState>}
          </div>
        </div>

        <div className="panel">
          <h4 className="section-title">Maintenance plans</h4>
          <div className="field-stack" style={{ marginTop: 16 }}>
            {maintenancePlans.length ? maintenancePlans.map((plan) => (
              <div className="panel-elevated" style={{ padding: "14px 16px" }} key={plan.id}>
                <div className="section-row">
                  <span className={severityBadge(plan.risk_level)}>{plan.risk_level}</span>
                  <span className={`status-badge ${plan.approved ? "status-badge--healthy" : "status-badge--warning"}`}>{plan.approved ? "approved" : "awaiting approval"}</span>
                </div>
                <div className="section-copy" style={{ marginTop: 8 }}>Next evaluation {plan.next_eval_time || "not scheduled"}</div>
                <div className="mono" style={{ marginTop: 8 }}>Created {formatMDT(plan.created_at)}</div>
              </div>
            )) : <EmptyState>No maintenance plans for this service yet.</EmptyState>}
          </div>
        </div>
      </div>

      {status ? <div className="status-message">{status}</div> : null}
    </section>
  );
}