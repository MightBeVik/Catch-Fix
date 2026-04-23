import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { fetchDashboard } from "../api/monitoring";
import { createService, deleteService, fetchServices, testServiceConnection, updateService } from "../api/registry";
import { formatMDT } from "../lib/time";

const providerPresets = {
  anthropic: {
    provider_type: "anthropic",
    model_name: "claude-sonnet-4-20250514",
    api_endpoint: "https://api.anthropic.com/v1/messages",
    api_key_env_var: "ANTHROPIC_API_KEY",
  },
  openai: {
    provider_type: "openai",
    model_name: "gpt-4.1-mini",
    api_endpoint: "https://api.openai.com/v1/chat/completions",
    api_key_env_var: "OPENAI_API_KEY",
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
  openai: "OpenAI",
  "openai-compatible": "LM Studio / OpenAI-Compatible",
  ollama: "Ollama",
};

const LOCAL_PROVIDER_OPTIONS = ["ollama", "openai-compatible"];
const CLOUD_PROVIDER_OPTIONS = ["anthropic", "openai"];

function deriveServiceType(provider_type) {
  return LOCAL_PROVIDER_OPTIONS.includes(provider_type) ? "Local" : "Cloud";
}

function createBlankForm(providerType = "anthropic") {
  return {
    serviceType: "Cloud",
    name: "",
    owner: "",
    environment: "dev",
    sensitivity: "internal",
    ...providerPresets[providerType],
  };
}

// Required fields and their human-readable labels
const REQUIRED_FIELDS = [
  { key: "name", label: "Service Name" },
  { key: "owner", label: "Owner" },
  { key: "model_name", label: "Model Name" },
  { key: "api_endpoint", label: "API Endpoint" },
];

export function RegistryPage() {
  const { canEdit } = useOutletContext();
  const [services, setServices] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [form, setForm] = useState(createBlankForm());
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState("");
  // Map of serviceId → test result, so each card shows its own result
  const [testResults, setTestResults] = useState({});
  const [testingId, setTestingId] = useState(null); // which service is currently being tested
  const [validationErrors, setValidationErrors] = useState([]);
  const [search, setSearch] = useState("");

  const isLocal = form.serviceType === "Local";

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
    setValidationErrors([]);
    setForm((current) => ({
      ...current,
      ...providerPresets[providerType],
      provider_type: providerType,
      serviceType: deriveServiceType(providerType),
    }));
  }

  function handleServiceTypeChange(newType) {
    setValidationErrors([]);
    // Default provider when switching types
    const defaultProvider = newType === "Cloud" ? "anthropic" : "ollama";
    setForm((current) => ({
      ...current,
      serviceType: newType,
      ...providerPresets[defaultProvider],
      provider_type: defaultProvider,
    }));
  }

  // Providers available for the current service type
  const availableProviders = isLocal ? LOCAL_PROVIDER_OPTIONS : CLOUD_PROVIDER_OPTIONS;

  function validate() {
    const errors = [];
    for (const { key, label } of REQUIRED_FIELDS) {
      if (!form[key] || String(form[key]).trim() === "") {
        errors.push(label);
      }
    }
    // api_key_env_var is required only for Cloud services
    if (!isLocal && (!form.api_key_env_var || String(form.api_key_env_var).trim() === "")) {
      errors.push("Server API Key Env Var (required for Cloud services)");
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setValidationErrors([]);

    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const payload = { ...form };
      // For local services, clear the api_key_env_var
      if (isLocal) payload.api_key_env_var = "";
      delete payload.serviceType;

      if (editingId) {
        await updateService(editingId, payload);
        setStatus("Service updated.");
      } else {
        await createService(payload);
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
    setTestingId(id);
    // Clear previous result for this card only
    setTestResults((prev) => ({ ...prev, [id]: null }));
    try {
      const data = await testServiceConnection(id, "Reply with a tiny JSON object containing a status field set to 'ok'.");
      const tr = data.test_result;
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          success: tr.success,
          detail: tr.detail || (tr.success ? "Connection successful." : "Connection failed."),
          latency_ms: tr.latency_ms,
          response_preview: tr.response_preview || "",
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          success: false,
          detail: error.message || "Connection test failed.",
          latency_ms: null,
          response_preview: "",
        },
      }));
    } finally {
      setTestingId(null);
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
        <form className="panel" onSubmit={handleSubmit} noValidate>
          <h4 className="section-title">{editingId ? "Edit service" : "Create service"}</h4>
          <div className="field-stack" style={{ marginTop: 16 }}>

            {/* ── Type (first field) ── */}
            <label className="field">
              <span className="field-label">
                type <span style={{ color: "var(--status-red)", marginLeft: 2 }}>*</span>
              </span>
              <div style={{ display: "flex", gap: 0, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                {["Local", "Cloud"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleServiceTypeChange(opt)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      border: "none",
                      borderRight: opt === "Local" ? "1px solid var(--border)" : "none",
                      background: form.serviceType === opt ? "var(--accent-blue)" : "var(--bg-elevated)",
                      color: form.serviceType === opt ? "#fff" : "var(--text-secondary)",
                      fontWeight: form.serviceType === opt ? 600 : 400,
                      cursor: canEdit ? "pointer" : "not-allowed",
                      fontSize: 13,
                      transition: "background 150ms ease, color 150ms ease",
                    }}
                  >
                    {opt === "Local" ? "🖥  Local" : "☁  Cloud"}
                  </button>
                ))}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                {isLocal
                  ? "Runs on your local machine (Ollama, LM Studio). No API key required."
                  : "Cloud-hosted provider (Anthropic, OpenAI, etc.). API key env var required."}
              </p>
            </label>

            {/* ── Name ── */}
            <label className="field">
              <span className="field-label">
                name <span style={{ color: "var(--status-red)", marginLeft: 2 }}>*</span>
              </span>
              <input
                className="input"
                disabled={!canEdit}
                placeholder="e.g. Claims Triage Bot"
                value={form.name}
                onChange={(event) => { setValidationErrors([]); setForm((c) => ({ ...c, name: event.target.value })); }}
              />
            </label>

            {/* ── Owner ── */}
            <label className="field">
              <span className="field-label">
                owner <span style={{ color: "var(--status-red)", marginLeft: 2 }}>*</span>
              </span>
              <input
                className="input"
                disabled={!canEdit}
                placeholder="e.g. Platform Reliability"
                value={form.owner}
                onChange={(event) => { setValidationErrors([]); setForm((c) => ({ ...c, owner: event.target.value })); }}
              />
            </label>

            {/* ── Environment ── */}
            <label className="field">
              <span className="field-label">environment</span>
              <select
                className="select"
                disabled={!canEdit}
                value={form.environment}
                onChange={(event) => setForm((c) => ({ ...c, environment: event.target.value }))}
              >
                {["dev", "prod"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            {/* ── Provider Type — filtered by Local / Cloud ── */}
            <label className="field">
              <span className="field-label">provider type</span>
              <select
                className="select"
                disabled={!canEdit}
                value={form.provider_type}
                onChange={(event) => applyProviderPreset(event.target.value)}
              >
                {availableProviders.map((value) => (
                  <option key={value} value={value}>{providerLabels[value]}</option>
                ))}
              </select>
            </label>

            {/* ── Model Name ── */}
            <label className="field">
              <span className="field-label">
                model name <span style={{ color: "var(--status-red)", marginLeft: 2 }}>*</span>
              </span>
              <input
                className="input"
                disabled={!canEdit}
                value={form.model_name}
                onChange={(event) => { setValidationErrors([]); setForm((c) => ({ ...c, model_name: event.target.value })); }}
              />
            </label>

            {/* ── Sensitivity ── */}
            <label className="field">
              <span className="field-label">sensitivity</span>
              <select
                className="select"
                disabled={!canEdit}
                value={form.sensitivity}
                onChange={(event) => setForm((c) => ({ ...c, sensitivity: event.target.value }))}
              >
                {["public", "internal", "confidential"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            {/* ── API Endpoint ── */}
            <label className="field">
              <span className="field-label">
                api endpoint <span style={{ color: "var(--status-red)", marginLeft: 2 }}>*</span>
              </span>
              <input
                className="input"
                disabled={!canEdit}
                value={form.api_endpoint}
                onChange={(event) => { setValidationErrors([]); setForm((c) => ({ ...c, api_endpoint: event.target.value })); }}
              />
            </label>

            {/* ── Server API Key Env Var — hidden for Local ── */}
            {!isLocal && (
              <label className="field" style={{ animation: "fadeIn 200ms ease" }}>
                <span className="field-label">
                  server api key env var{" "}
                  <span style={{ color: "var(--status-red)", marginLeft: 2 }}>*</span>
                </span>
                <input
                  className="input"
                  disabled={!canEdit}
                  placeholder="e.g. ANTHROPIC_API_KEY"
                  value={form.api_key_env_var}
                  onChange={(event) => { setValidationErrors([]); setForm((c) => ({ ...c, api_key_env_var: event.target.value })); }}
                />
              </label>
            )}

            {/* ── Validation error block ── */}
            {validationErrors.length > 0 && (
              <div
                style={{
                  padding: "12px 14px",
                  background: "var(--callout-danger-bg)",
                  border: "1px solid var(--status-red)",
                  borderLeft: "3px solid var(--status-red)",
                  borderRadius: "var(--radius-md)",
                  display: "grid",
                  gap: 6,
                }}
              >
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--status-red)" }}>
                  Please fill in the following required fields:
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)" }}>
                  {validationErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="panel-elevated" style={{ padding: "14px 16px" }}>
              <div className="field-label">Provider preset</div>
              <div className="section-copy" style={{ marginTop: 8 }}>
                {isLocal
                  ? "Local providers (Ollama, LM Studio) run on your machine and do not require server-side API keys."
                  : "Cloud providers use a server env var for authentication. The key name is saved on the server — never the key value."}
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
                  setValidationErrors([]);
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
              const svcType = deriveServiceType(service.provider_type);
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
                    <span
                      className="status-badge"
                      style={{
                        background: svcType === "Local" ? "var(--status-gray-bg)" : "var(--status-info-bg)",
                        color: svcType === "Local" ? "var(--status-gray)" : "var(--status-info-text)",
                        borderColor: svcType === "Local" ? "var(--status-gray)" : "var(--accent-blue)",
                      }}
                    >
                      {svcType === "Local" ? "🖥 Local" : "☁ Cloud"}
                    </span>
                    <span className="status-badge status-badge--info">{providerLabels[service.provider_type] || service.provider_type}</span>
                    <span className="status-badge status-badge--info">{service.environment}</span>
                    <span className="status-badge status-badge--neutral">{service.sensitivity}</span>
                    {testingId === service.id ? (
                      <span className="status-badge status-badge--info">Connecting in Progress</span>
                    ) : !service.connection_ready ? (
                      <span className="status-badge status-badge--warning">needs config</span>
                    ) : testResults[service.id]?.success || runtimeService?.latest_metric ? (
                      <span className="status-badge status-badge--healthy">ready</span>
                    ) : testResults[service.id]?.success === false ? null : (
                      <span className="status-badge status-badge--neutral">untested</span>
                    )}
                  </div>

                  <div className="service-meta">
                    <span>Last connection latency: <span className="mono">{connection.latency}</span></span>
                    <span>Last evaluated: <span className="mono">{runtimeService?.latest_metric?.timestamp ? formatMDT(runtimeService.latest_metric.timestamp) : "Never"}</span></span>
                    <span className="mono">{service.api_endpoint}</span>
                  </div>

                  <div className="button-row">
                    <Link className="button button-secondary" to={`/registry/${service.id}`}>
                      Open details
                    </Link>
                    <button
                      className="button button-secondary"
                      disabled={!service.connection_ready || testingId === service.id}
                      onClick={() => handleTest(service.id)}
                      title={service.connection_ready ? "" : service.connection_message}
                      type="button"
                    >
                      {testingId === service.id ? "Testing…" : "Test connection"}
                    </button>
                    <button
                      className="button button-secondary"
                      disabled={!canEdit}
                      onClick={() => {
                        setEditingId(service.id);
                        setValidationErrors([]);
                        setForm({
                          serviceType: deriveServiceType(service.provider_type),
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

                  {/* ── Inline test connection result ── */}
                  {testResults[service.id] && (() => {
                    const tr = testResults[service.id];
                    return (
                      <div
                        style={{
                          marginTop: 4,
                          padding: "10px 12px",
                          borderTop: `3px solid ${tr.success ? "var(--status-green)" : "var(--status-red)"}`,
                          background: tr.success ? "var(--status-green-bg)" : "var(--status-red-bg)",
                          borderRadius: "0 0 var(--radius-md) var(--radius-md)",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: tr.success ? "var(--status-green)" : "var(--status-red)",
                          }}>
                            {tr.success ? "✓ Connection OK" : "✗ Connection failed"}
                            {tr.latency_ms !== null && (
                              <span style={{ fontWeight: 400, marginLeft: 6 }}>{tr.latency_ms} ms</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => setTestResults((prev) => ({ ...prev, [service.id]: null }))}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-muted)", padding: 0 }}
                          >
                            ✕
                          </button>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                          {tr.detail}
                        </p>
                        {tr.response_preview && (
                          <p style={{ margin: 0, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", wordBreak: "break-all" }}>
                            {tr.response_preview}
                          </p>
                        )}
                      </div>
                    );
                  })()}
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