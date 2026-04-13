import { registryDistribution, registryFeed, registryServices, registryStats } from "../data/registryData";

function environmentBadge(environment) {
  return environment === "PROD" ? "badge-prod" : "badge-dev";
}

function sensitivityClass(sensitivity) {
  return sensitivity.toLowerCase();
}

export default function RegistryPage() {
  return (
    <>
      <div className="header-row">
        <div className="page-header">
          <h1 className="page-title">Service Registry</h1>
          <p className="page-subtitle">
            Centralized authority for all active AI models and endpoints within the Sovereign Ledger ecosystem.
            Managed via automated compliance protocols.
          </p>
        </div>
        <button className="btn btn-primary">Register New Service</button>
      </div>

      <div className="stats-row">
        {registryStats.map((item) => (
          <div className="stat-card animate-in" key={item.label}>
            <div className="stat-label">{item.label}</div>
            <div className="stat-value">{item.value}</div>
            <div className={`stat-sub ${item.tone}`}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <input type="text" placeholder="Search registry..." readOnly />
        </div>
        <button className="btn btn-outline btn-sm">All Environments</button>
        <span className="filter-count">Showing 1-12 of 124 services</span>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Owner</th>
              <th>Environment</th>
              <th>Model Name</th>
              <th>Data Sensitivity</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {registryServices.map((service) => (
              <tr key={service.id}>
                <td>
                  <div className="table-service-name">{service.name}</div>
                  <div className="table-service-id">ID: {service.id}</div>
                </td>
                <td>{service.owner}</td>
                <td>
                  <span className={`badge ${environmentBadge(service.environment)}`}>{service.environment}</span>
                </td>
                <td className="mono-text">{service.modelName}</td>
                <td>
                  <span className={`sensitivity ${sensitivityClass(service.sensitivity)}`}>{service.sensitivity}</span>
                </td>
                <td>
                  <div className="status-cell">
                    <span className={`status-dot ${service.status}`} />
                    <div>
                      <div className="latency-value">{service.latency}</div>
                      <div className="latency-label">latency</div>
                    </div>
                  </div>
                </td>
                <td>
                  <button className={`btn ${service.status === "error" ? "btn-danger" : "btn-outline"} btn-sm`}>
                    {service.action}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          <span className="table-footer-text">Compliance Status: Verified by Sentinel v2.4</span>
          <div className="pagination">
            <button>‹</button>
            <button className="active">1</button>
            <button>2</button>
            <button>›</button>
          </div>
        </div>
      </div>

      <div className="bottom-panels">
        <div className="feed-card">
          <div className="feed-header">
            <span className="feed-title">
              <span className="status-dot online pulse" />
              Operational Intelligence Feed
            </span>
          </div>
          {registryFeed.map((entry) => (
            <div className="feed-item" key={entry}>
              <span className="feed-time">
                <span className="status-dot online" />
                Live
              </span>
              <span className="feed-text">{entry}</span>
            </div>
          ))}
        </div>

        <div className="snapshot-card">
          <div className="snapshot-title">Registry Snapshot</div>
          <div className="snapshot-subtitle">Active Model Distribution</div>

          {registryDistribution.map((item) => (
            <div className="dist-item" key={item.label}>
              <div className="dist-label">
                <span>{item.label}</span>
                <span>{item.value}%</span>
              </div>
              <div className="dist-bar">
                <div className={`dist-bar-fill ${item.tone}`} style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}

          <div className="sovereignty-badge">
            <div>
              <h4>Data Sovereignty</h4>
              <p>
                All registry models are bound by the <em>Sovereign Protocol v1.2</em>. Encrypted data residency
                is enforced per service ID.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}