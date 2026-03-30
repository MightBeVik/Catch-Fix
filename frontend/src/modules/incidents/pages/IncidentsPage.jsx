import { incidents, troubleshootingChecklist } from "../data/incidentsData";

export default function IncidentsPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Incident Triage Center</h1>
        <p className="page-subtitle">
          Centralized incident management with AI-assisted diagnostics, guided troubleshooting, and stakeholder
          communication workflows.
        </p>
      </div>

      <div className="panel-grid two-column-grid">
        <div className="card detail-card">
          <h2 className="section-title">Open Incidents</h2>
          <div className="stack-list">
            {incidents.map((incident) => (
              <div className="list-card" key={incident.id}>
                <div className="list-card-title">{incident.id} · {incident.service}</div>
                <div className="list-card-meta">Severity: {incident.severity}</div>
                <p>{incident.symptoms}</p>
                <div className="list-card-meta">{incident.timeline}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card detail-card">
          <h2 className="section-title">Incident Triage & Response</h2>
          <p className="placeholder-text">
            Create incidents, run guided troubleshooting checklists, generate LLM-assisted summaries with human
            approval, and manage escalation workflows.
          </p>
          <ul className="checklist">
            {troubleshootingChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="placeholder-status">
            <span className="status-dot warning pulse" />
            Module Under Development
          </div>
        </div>
      </div>
    </>
  );
}