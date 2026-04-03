import { useEffect, useMemo, useState } from "react";

import { createRegistryService, fetchRegistryServices, fetchRegistrySummary, testRegistryService } from "../api/registryApi";

const initialForm = {
  name: "",
  owner: "",
  environment: "DEV",
  model_name: "",
  sensitivity: "Internal",
};

function environmentBadge(environment) {
  return environment === "PROD" ? "badge-prod" : "badge-dev";
}

function sensitivityClass(sensitivity) {
  return sensitivity.toLowerCase();
}

function lastTestLabel(service) {
  if (!service.last_test?.tested_at) {
    return "Not tested";
  }

  if (service.last_test.success) {
    return `${service.last_test.latency_ms} ms`;
  }

  return service.last_test.detail;
}

export default function RegistryPage() {
  const [summary, setSummary] = useState({ stats: [] });
  const [feed, setFeed] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [environmentFilter, setEnvironmentFilter] = useState("ALL");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [activeTestId, setActiveTestId] = useState("");

  async function loadRegistry() {
    setLoading(true);
    setError("");

    try {
      const [summaryResponse, servicesResponse] = await Promise.all([
        fetchRegistrySummary(),
        fetchRegistryServices(),
      ]);

      setSummary(summaryResponse.summary);
      setFeed(summaryResponse.feed);
      setServices(servicesResponse);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRegistry();
  }, []);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch = [service.name, service.owner, service.model_name, service.id]
        .join(" ")
        .toLowerCase()
        .includes(searchText.toLowerCase());

      const matchesEnvironment = environmentFilter === "ALL" || service.environment === environmentFilter;
      return matchesSearch && matchesEnvironment;
    });
  }, [environmentFilter, searchText, services]);

  async function handleCreateService(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await createRegistryService(form);
      setForm(initialForm);
      await loadRegistry();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTestConnection(serviceId) {
    setActiveTestId(serviceId);
    setError("");

    try {
      const updatedService = await testRegistryService(serviceId);
      setServices((currentServices) =>
        currentServices.map((service) => (service.id === updatedService.id ? updatedService : service))
      );

      const summaryResponse = await fetchRegistrySummary();
      setSummary(summaryResponse.summary);
      setFeed(summaryResponse.feed);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActiveTestId("");
    }
  }

  return (
    <>
      <div className="header-row registry-header-row">
        <div className="page-header">
          <h1 className="page-title">Registry Connections</h1>
          <p className="page-subtitle">
            Register model endpoints, track connection health, and run a prompt-based connection test that returns
            latency plus pass or fail status.
          </p>
        </div>
        <button className="btn btn-primary" type="button" onClick={loadRegistry}>
          Refresh Registry
        </button>
      </div>

      <div className="stats-row">
        {summary.stats.map((item) => (
          <div className="stat-card" key={item.label}>
            <div className="stat-label">{item.label}</div>
            <div className="stat-value">{item.value}</div>
            <div className={`stat-sub ${item.tone}`}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="card registry-form-card">
        <div className="section-heading-row">
          <div>
            <h2 className="section-title">Register Connection</h2>
            <p className="section-subtitle">Add a new model connection using the Module 1 parameters only.</p>
          </div>
        </div>

        <form className="registry-form-grid" onSubmit={handleCreateService}>
          <label className="field-group">
            <span className="field-label">Name</span>
            <input
              className="field-input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="FraudAssistant_v2"
              required
            />
          </label>

          <label className="field-group">
            <span className="field-label">Owner</span>
            <input
              className="field-input"
              value={form.owner}
              onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))}
              placeholder="Risk Operations"
              required
            />
          </label>

          <label className="field-group">
            <span className="field-label">Environment</span>
            <select
              className="field-input"
              value={form.environment}
              onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value }))}
            >
              <option value="DEV">DEV</option>
              <option value="PROD">PROD</option>
            </select>
          </label>

          <label className="field-group">
            <span className="field-label">Model Name</span>
            <input
              className="field-input"
              value={form.model_name}
              onChange={(event) => setForm((current) => ({ ...current, model_name: event.target.value }))}
              placeholder="gpt-4o-mini"
              required
            />
          </label>

          <label className="field-group">
            <span className="field-label">Data Sensitivity</span>
            <select
              className="field-input"
              value={form.sensitivity}
              onChange={(event) => setForm((current) => ({ ...current, sensitivity: event.target.value }))}
            >
              <option value="Public">Public</option>
              <option value="Internal">Internal</option>
              <option value="Confidential">Confidential</option>
            </select>
          </label>

          <div className="field-group field-group-action">
            <span className="field-label">Action</span>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Add Connection"}
            </button>
          </div>
        </form>
      </div>

      <div className="filter-bar registry-filter-bar">
        <div className="search-input interactive-search-input">
          <input
            type="text"
            placeholder="Search by service, owner, model, or ID..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
        <div className="inline-filter-group">
          {[
            { label: "All", value: "ALL" },
            { label: "DEV", value: "DEV" },
            { label: "PROD", value: "PROD" },
          ].map((filterOption) => (
            <button
              key={filterOption.value}
              className={`filter-chip ${environmentFilter === filterOption.value ? "active" : ""}`.trim()}
              type="button"
              onClick={() => setEnvironmentFilter(filterOption.value)}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
        <span className="filter-count">Showing {filteredServices.length} connections</span>
      </div>

      {error ? <div className="registry-banner error">{error}</div> : null}
      {loading ? <div className="registry-banner">Loading registry services...</div> : null}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Owner</th>
              <th>Environment</th>
              <th>Model Name</th>
              <th>Data Sensitivity</th>
              <th>Last Test</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map((service) => (
              <tr key={service.id}>
                <td>
                  <a className="table-service-name link-button" href={`/service-detail?id=${service.id}`}>
                    {service.name}
                  </a>
                  <div className="table-service-id">ID: {service.id}</div>
                </td>
                <td>{service.owner}</td>
                <td>
                  <span className={`badge ${environmentBadge(service.environment)}`}>{service.environment}</span>
                </td>
                <td className="mono-text">{service.model_name}</td>
                <td>
                  <span className={`sensitivity ${sensitivityClass(service.sensitivity)}`}>{service.sensitivity}</span>
                </td>
                <td>
                  <div className="status-cell">
                    <span className={`status-dot ${service.status === "untested" ? "offline" : service.status}`} />
                    <div>
                      <div className="latency-value">{lastTestLabel(service)}</div>
                      <div className="latency-label">
                        {service.last_test?.success ? "Success" : service.status === "untested" ? "Pending" : "Fail"}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className={`btn ${service.status === "error" ? "btn-danger" : "btn-outline"} btn-sm`}
                      type="button"
                      onClick={() => handleTestConnection(service.id)}
                      disabled={activeTestId === service.id}
                    >
                      {activeTestId === service.id ? "Testing..." : "Test Connection"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && filteredServices.length === 0 ? (
          <div className="empty-state">No registry connections match the current filter.</div>
        ) : null}
      </div>

      <div className="bottom-panels registry-bottom-panels">
        <div className="feed-card">
          <div className="feed-header">
            <span className="feed-title">
              <span className="status-dot online pulse" />
              Latest Connection Activity
            </span>
          </div>
          {feed.map((entry) => (
            <div className="feed-item" key={`${entry.timestamp}-${entry.message}`}>
              <span className="feed-time">{entry.timestamp.slice(11, 16)} UTC</span>
              <span className="feed-text">{entry.message}</span>
            </div>
          ))}
        </div>

        <div className="snapshot-card registry-snapshot-card">
          <div className="snapshot-title">Connection Test Flow</div>
          <div className="snapshot-subtitle">Current module behavior</div>

          <div className="stack-list registry-guidance-list">
            <div className="list-card">
              <div className="list-card-title">1. Register a connection</div>
              <div className="list-card-meta">Capture name, owner, environment, model, and sensitivity.</div>
            </div>
            <div className="list-card">
              <div className="list-card-title">2. Send a health prompt</div>
              <div className="list-card-meta">The backend sends a small PONG prompt during the test request.</div>
            </div>
            <div className="list-card">
              <div className="list-card-title">3. Record latency and outcome</div>
              <div className="list-card-meta">Each run updates service health plus the activity feed.</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}