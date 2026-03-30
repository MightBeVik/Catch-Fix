import { maintenancePlans } from "../data/incidentsData";

export default function MaintenancePage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Maintenance Planner</h1>
        <p className="page-subtitle">
          Schedule evaluations, plan update windows, manage rollback procedures, and coordinate maintenance
          across the service fleet.
        </p>
      </div>

      <div className="panel-grid">
        <div className="card detail-card">
          <h2 className="section-title">Maintenance Orchestrator</h2>
          <p className="placeholder-text">
            Plan and schedule evaluation runs, define update windows with rollback procedures, and manage
            service maintenance lifecycle with approval workflows.
          </p>
        </div>

        <div className="cards-grid two-column-grid">
          {maintenancePlans.map((plan) => (
            <div className="card detail-card" key={plan.service}>
              <h3 className="section-title">{plan.service}</h3>
              <div className="info-list compact">
                <div><strong>Window:</strong> {plan.window}</div>
                <div><strong>Risk:</strong> {plan.risk}</div>
                <div><strong>Rollback:</strong> {plan.rollback}</div>
                <div><strong>Validation:</strong> {plan.validation}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}