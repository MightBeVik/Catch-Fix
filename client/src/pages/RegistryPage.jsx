import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { fetchDashboard } from "../api/monitoring";
import { createService, deleteService, fetchServices, testServiceConnection, updateService } from "../api/registry";

const providerPresets = {
  anthropic: {
    provider_type: "anthropic",
    model_name: "claude-sonnet-4-20250514",
    api_endpoint: "https://api.anthropic.com/v1/messages",
    api_key_env_var: "ANTHROPIC_API_KEY",
  },
  "openai-compatible": {
    provider_type: "openai-compatible",
    model_name: "gpt-4.1-mini",
    api_endpoint: "http://127.0.0.1:1234/v1/chat/completions",
    api_key_env_var: "",
  },
  ollama: {
    provider_type: "ollama",
    model_name: "llama3.2",
    api_endpoint: "http://127.0.0.1:11434/api/generate",
    api_key_env_var: "",
  },
};

const providerLabels = {
  anthropic: "Anthropic",
  "openai-compatible": "OpenAI-compatible",
  ollama: "Ollama",
};

function createBlankForm(providerType = "openai-compatible") {
  return {
    name: "",
    owner: "",
    environment: "dev",
    sensitivity: "internal",
    ...providerPresets[providerType],
  };
}

export function RegistryPage() {
  const { canEdit } = useOutletContext();
  const [services, setServices] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [form, setForm] = useState(createBlankForm());
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  async function loadServices() {
    const [serviceData, dashboardData] = await Promise.all([fetchServices(), fetchDashboard()]);
    setServices(serviceData.items || []);
    setDashboard(dashboardData);
  }

  useEffect(() => {
    loadServices().catch((error) => setStatus(error.message));
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return services.filter((service) => JSON.stringify(service).toLowerCase().includes(term));
  }, [search, services]);

  const serviceRuntimeById = Object.fromEntries((dashboard?.services || []).map((service) => [service.id, service]));

  function getConnectionState(serviceId) {
    const runtimeService = serviceRuntimeById[serviceId];
    const metric = runtimeService?.latest_metric;
    if (!metric) {
      return { label: "Unknown", badgeClass: "status-badge status-badge--neutral", dotClass: "status-dot", latency: "--" };
    }
    if (runtimeService?.drift_flagged || metric.error_rate >= 50 || metric.quality_score < 70) {
      return { label: "Critical", badgeClass: "status-badge status-badge--critical", dotClass: "status-dot status-dot--critical", latency: `${metric.latency_ms}ms` };
    }
    if (metric.error_rate > 0 || metric.quality_score < 90) {
      return { label: "Warning", badgeClass: "status-badge status-badge--warning", dotClass: "status-dot status-dot--warning", latency: `${metric.latency_ms}ms` };
    }
    return { label: "Healthy", badgeClass: "status-badge status-badge--healthy", dotClass: "status-dot status-dot--live", latency: `${metric.latency_ms}ms` };
  }

  function applyProviderPreset(providerType) {
    setForm((current) => ({
      ...current,
      ...providerPresets[providerType],
      provider_type: providerType,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      if (editingId) {
        await updateService(editingId, form);
        setStatus("Service updated.");
      } else {
        await createService(form);
        setStatus("Service created.");
      }
      setForm(createBlankForm());
      setEditingId(null);
      await loadServices();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteService(id);
      setStatus("Service deleted.");
      await loadServices();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleTest(id) {
    try {
      const result = await testServiceConnection(id, "Reply with a tiny JSON object containing a status key.");
      setStatus(`Connection result: ${result.test_result.status} in ${result.test_result.latency_ms} ms`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h3 className="page-title">Service Registry</h3>
          <p className="page-description">
            Full CRUD for AI services across Anthropic, OpenAI-compatible endpoints, and Ollama. Secrets stay on the server and never enter the browser.
          </p>
        </div>
        <input
          className="input"
          style={{ maxWidth: 320 }}
          placeholder="Search services"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="split-layout" style={{ gridTemplateColumns: "minmax(340px, 380px) minmax(0, 1fr)" }}>
        <form className="panel" onSubmit={handleSubmit}>
          <h4 className="section-title">{editingId ? "Edit service" : "Create service"}</h4>
          <div className="field-stack" style={{ marginTop: 16 }}>
            <label className="field">
              <span className="field-label">name</span>
              <input className="input" disabled={!canEdit} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="field">
              <span className="field-label">owner</span>
              <input className="input" disabled={!canEdit} value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))} />
            </label>
            <label className="field">
              <span className="field-label">environment</span>
              <select className="select" disabled={!canEdit} value={form.environment} onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value }))}>
                {["dev", "prod"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">provider type</span>
              <select className="select" disabled={!canEdit} value={form.provider_type} onChange={(event) => applyProviderPreset(event.target.value)}>
                {Object.entries(providerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">model name</span>
              <input className="input" disabled={!canEdit} value={form.model_name} onChange={(event) => setForm((current) => ({ ...current, model_name: event.target.value }))} />
            </label>
            <label className="field">
              <span className="field-label">sensitivity</span>
              <select className="select" disabled={!canEdit} value={form.sensitivity} onChange={(event) => setForm((current) => ({ ...current, sensitivity: event.target.value }))}>
                {["public", "internal", "confidential"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">api endpoint</span>
              <input className="input" disabled={!canEdit} value={form.api_endpoint} onChange={(event) => setForm((current) => ({ ...current, api_endpoint: event.target.value }))} />
            </label>
            <label className="field">
              <span className="field-label">server api key env var</span>
              <input className="input" disabled={!canEdit} placeholder="Optional for LM Studio / local endpoints" value={form.api_key_env_var} onChange={(event) => setForm((current) => ({ ...current, api_key_env_var: event.target.value }))} />
            </label>
            <div className="panel-elevated" style={{ padding: "14px 16px" }}>
              <div className="field-label">Provider preset</div>
              <div className="section-copy" style={{ marginTop: 8 }}>
                Anthropic uses a server env var. OpenAI-compatible works for OpenAI, LM Studio, or any matching wrapper. Ollama targets a local REST endpoint and does not need a key.
              </div>
            </div>
          </div>
          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="button button-primary" disabled={!canEdit} type="submit">
              {editingId ? "Save changes" : "Create service"}
            </button>
            {editingId ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(createBlankForm());
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div>
          <div className="section-row" style={{ marginBottom: 16 }}>
            <div className="field-label">Registered Services</div>
            <div className="status-banner-inline">{filtered.length} service(s)</div>
          </div>
          <div className="service-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {filtered.map((service) => {
              const connection = getConnectionState(service.id);
              const runtimeService = serviceRuntimeById[service.id];
              return (
                <div className="service-card" key={service.id}>
                  <div className="service-card-header">
                    <div>
                      <h4 className="service-card-title">{service.name}</h4>
                      <div className="service-meta" style={{ marginTop: 6 }}>
                        <span>{service.owner}</span>
                        <span>{providerLabels[service.provider_type] || service.provider_type}</span>
                        <span className="mono">{service.model_name}</span>
                      </div>
                    </div>
                    <span className={connection.badgeClass}>
                      <span className={connection.dotClass} />
                      {connection.label}
                    </span>
                  </div>

                  <div className="badge-row">
                    <span className="status-badge status-badge--info">{providerLabels[service.provider_type] || service.provider_type}</span>
                    <span className="status-badge status-badge--info">{service.environment}</span>
                    <span className="status-badge status-badge--neutral">{service.sensitivity}</span>
                    <span className={`status-badge ${service.connection_ready ? "status-badge--healthy" : "status-badge--warning"}`}>
                      {service.connection_ready ? "ready" : "needs config"}
                    </span>
                  </div>

                  <div className="service-meta">
                    <span>Last connection latency: <span className="mono">{connection.latency}</span></span>
                    <span>Last evaluated: <span className="mono">{runtimeService?.latest_metric?.timestamp ?? "Never"}</span></span>
                    <span>{service.connection_message}</span>
                    <span className="mono">{service.api_key_env_var || "No server auth env var configured"}</span>
                    <span className="mono">{service.api_endpoint}</span>
                  </div>

                  <div className="button-row">
                    <Link className="button button-secondary" to={`/registry/${service.id}`}>
                      Open details
                    </Link>
                    <button className="button button-secondary" disabled={!service.connection_ready} onClick={() => handleTest(service.id)} title={service.connection_ready ? "" : service.connection_message} type="button">
                      Test connection
                    </button>
                  <button
                    className="button button-secondary"
                    disabled={!canEdit}
                    onClick={() => {
                      setEditingId(service.id);
                      setForm({
                        name: service.name,
                        owner: service.owner,
                        environment: service.environment,
                        provider_type: service.provider_type,
                        model_name: service.model_name,
                        sensitivity: service.sensitivity,
                        api_endpoint: service.api_endpoint,
                        api_key_env_var: service.api_key_env_var || "",
                      });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="button button-danger"
                    disabled={!canEdit}
                    onClick={() => handleDelete(service.id)}
                    type="button"
                  >
                    Delete
                  </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {status ? <div className="status-message">{status}</div> : null}
    </section>
  );
}