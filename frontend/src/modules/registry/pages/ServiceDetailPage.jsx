import { registryServices } from "../data/registryData";

const service = registryServices[0];

export default function ServiceDetailPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Service Detail</h1>
        <p className="page-subtitle">
          Deep inspection panel for individual AI service configurations, performance metrics, and compliance
          history.
        </p>
      </div>

      <div className="panel-grid two-column-grid">
        <div className="card detail-card">
          <h2 className="section-title">Service Inspector</h2>
          <div className="info-list">
            <div><strong>Name:</strong> {service.name}</div>
            <div><strong>ID:</strong> {service.id}</div>
            <div><strong>Owner:</strong> {service.owner}</div>
            <div><strong>Environment:</strong> {service.environment}</div>
            <div><strong>Model:</strong> {service.modelName}</div>
            <div><strong>Sensitivity:</strong> {service.sensitivity}</div>
          </div>
        </div>

        <div className="card detail-card">
          <h2 className="section-title">Starter Ownership Scope</h2>
          <p className="placeholder-text">
            This page lives under the registry module so the Module 1 owner can evolve service detail,
            connection history, and configuration workflows independently.
          </p>
          <div className="placeholder-status">
            <span className="status-dot warning pulse" />
            Ready for independent build-out
          </div>
        </div>
      </div>
    </>
  );
}