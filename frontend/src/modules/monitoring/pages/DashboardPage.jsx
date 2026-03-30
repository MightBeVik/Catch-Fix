import { monitoringFeed, monitoringServices, monitoringStats } from "../data/monitoringData";

function toneClass(tone) {
  if (tone === "good") {
    return "good";
  }
  if (tone === "warn") {
    return "warn";
  }
  return "neutral";
}

export default function DashboardPage() {
  return (
    <>
      <div className="header-row">
        <div className="page-header">
          <h1 className="page-title">Global Governance Core</h1>
          <p className="page-subtitle">
            Real-time health monitoring of autonomous AI agents across the sovereign ledger network.
          </p>
        </div>
        <div className="header-tags">
          <span className="network-tag">Network: Mainnet-Alpha</span>
          <span className="live-sync">
            <span className="status-dot online pulse" />
            Live Syncing
          </span>
        </div>
      </div>

      <div className="stats-row">
        {monitoringStats.map((item) => (
          <div className="stat-card animate-in" key={item.label}>
            <div className="stat-label">{item.label}</div>
            <div className="stat-value">{item.value}</div>
            <div className={`stat-sub ${item.tone}`}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="section-header">
        <h2 className="section-title">Active AI Services</h2>
        <div className="button-row">
          <button className="btn btn-outline btn-sm">Filter</button>
          <button className="btn btn-outline btn-sm">Sort: Health</button>
        </div>
      </div>

      <div className="services-grid">
        {monitoringServices.map((service) => (
          <div className={`service-card animate-in ${service.drift ? "drift" : ""}`.trim()} key={service.name}>
            <div className="service-card-header">
              <div>
                <div className="service-meta-row">
                  <div className="service-card-icon">AI</div>
                  <div>
                    <div className="service-card-name">{service.name}</div>
                    <div className="service-card-version">{service.version}</div>
                  </div>
                </div>
              </div>
              <span className={`badge ${service.badge}`}>{service.status}</span>
            </div>

            <div className="service-card-metrics">
              {service.metrics.map((metric) => (
                <div className="metric" key={metric.label}>
                  <div className="metric-label">{metric.label}</div>
                  <div className={`metric-value ${toneClass(metric.tone)}`}>{metric.value}</div>
                </div>
              ))}
            </div>

            <div className="quality-trend">
              <div className="quality-trend-header">
                <span className="quality-trend-label">Quality Trend</span>
                <span className="quality-trend-status">{service.trendStatus}</span>
              </div>
              <div className="trend-bars">
                {service.bars.map((bar, index) => (
                  <div
                    key={`${service.name}-${index}`}
                    className={`trend-bar ${bar > 84 ? "high" : bar < 58 ? "low" : "medium"}`}
                    style={{ height: `${bar}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="add-service-card animate-in">
          <div className="add-icon">+</div>
          <span>Register New Service</span>
        </div>
      </div>

      <div className="kill-switch">
        <button className="btn btn-danger">Emergency Kill Switch</button>
      </div>

      <div className="bottom-panels">
        <div className="feed-card">
          <div className="feed-header">
            <span className="feed-title">
              <span className="status-dot online pulse" />
              Infrastructure Integrity Feed
            </span>
          </div>
          {monitoringFeed.map((entry) => (
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
          <div className="snapshot-title">Compliance Score</div>
          <div className="compliance-gauge">
            <div className="gauge-circle">
              <span className="gauge-value">90</span>
            </div>
            <div className="gauge-label">Sovereign Standard</div>
            <p className="gauge-note">
              Your network is currently compliant with <strong>Tier 1 Data Privacy</strong> protocols.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}