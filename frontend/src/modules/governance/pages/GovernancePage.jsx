import { auditEntries, exportContents, policies, roles } from "../data/governanceData";

export default function GovernancePage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Governance & Compliance</h1>
        <p className="page-subtitle">
          Role-based access control, audit logging, data handling policies, and compliance evidence export for
          regulatory requirements.
        </p>
      </div>

      <div className="cards-grid two-column-grid">
        <div className="card detail-card">
          <h2 className="section-title">Governance Framework</h2>
          <p className="placeholder-text">
            RBAC enforcement, comprehensive audit logging, data handling policies, and compliance evidence
            export with time-range filtering for regulatory requirements.
          </p>
          <div className="info-list compact">
            {roles.map((item) => (
              <div key={item.role}>
                <strong>{item.role}:</strong> {item.scope}
              </div>
            ))}
          </div>
        </div>

        <div className="card detail-card">
          <h2 className="section-title">Audit Trail</h2>
          <ul className="checklist">
            {auditEntries.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>

        <div className="card detail-card">
          <h2 className="section-title">Data Handling Policy</h2>
          <ul className="checklist">
            {policies.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="card detail-card">
          <h2 className="section-title">Compliance Evidence Export</h2>
          <ul className="checklist">
            {exportContents.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}