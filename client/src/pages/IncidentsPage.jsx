import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { approveIncidentSummary, createIncident, fetchIncidents, generateIncidentSummary } from "../api/incidents";
import { fetchServices } from "../api/registry";

const defaultChecklist = {
  data_issue: false,
  prompt_change: false,
  model_update: false,
  infrastructure_problem: false,
  safety_policy_failure: false,
};

const blankForm = {
  service_name: "",
  severity: "medium",
  symptoms: "",
  timeline: "",
  checklist_json: defaultChecklist,
  approved: false,
};

export function IncidentsPage() {
  const { canEdit, meta } = useOutletContext();
  const [incidents, setIncidents] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [drafts, setDrafts] = useState({});
  const [status, setStatus] = useState("");

  async function loadPage() {
    const [incidentData, serviceData] = await Promise.all([fetchIncidents(), fetchServices()]);
    setIncidents(incidentData.items || []);
    setServices(serviceData.items || []);
  }

  useEffect(() => {
    loadPage().catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    if (!form.service_name && services[0]) {
      setForm((current) => ({ ...current, service_name: services[0].name }));
    }
  }, [form.service_name, services]);

  const serviceIdByName = Object.fromEntries(services.map((service) => [service.name, service.id]));
  const anthropicReady = Boolean(meta?.runtime?.anthropic_configured);

  async function handleCreate(event) {
    event.preventDefault();
    try {
      await createIncident(form);
      setForm(blankForm);
      setStatus("Incident created.");
      await loadPage();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleGenerateSummary(id) {
    try {
      const result = await generateIncidentSummary(id);
      setDrafts((current) => ({ ...current, [id]: result.draft_summary }));
      setStatus("Draft summary generated. Review before saving.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleApprove(id) {
    try {
      await approveIncidentSummary(id, drafts[id]);
      setStatus("Incident summary approved and saved.");
      await loadPage();
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="page">
      <div>
        <h3 className="page-title">Incident Triage</h3>
        <p className="page-description">
          Create incidents, mark troubleshooting hypotheses, generate review-only Claude summaries, and explicitly approve before persistence.
        </p>
      </div>

      <div className="split-layout" style={{ gridTemplateColumns: "minmax(0, 1.6fr) minmax(340px, 1fr)" }}>
        <form className="panel" onSubmit={handleCreate}>
          <h4 className="section-title">Create incident</h4>
          <div className="field-stack" style={{ marginTop: 16 }}>
            {services.length ? (
              <select className="select" disabled={!canEdit} value={form.service_name} onChange={(event) => setForm((current) => ({ ...current, service_name: event.target.value }))}>
                {services.map((service) => (
                  <option key={service.id} value={service.name}>{service.name}</option>
                ))}
              </select>
            ) : (
              <input className="input" disabled={!canEdit} placeholder="Service name" value={form.service_name} onChange={(event) => setForm((current) => ({ ...current, service_name: event.target.value }))} />
            )}
            <select className="select" disabled={!canEdit} value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}>
              {["low", "medium", "high", "critical"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <textarea className="textarea" disabled={!canEdit} placeholder="Symptoms" value={form.symptoms} onChange={(event) => setForm((current) => ({ ...current, symptoms: event.target.value }))} />
            <textarea className="textarea" disabled={!canEdit} placeholder="Timeline" value={form.timeline} onChange={(event) => setForm((current) => ({ ...current, timeline: event.target.value }))} />
            <div className="panel-elevated" style={{ padding: "14px 16px" }}>
              <div className="field-label">Checklist</div>
              <div className="field-stack" style={{ marginTop: 12 }}>
                {Object.keys(defaultChecklist).map((item) => (
                  <label className="checkbox-line" key={item}>
                    <input
                      checked={form.checklist_json[item]}
                      disabled={!canEdit}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        checklist_json: { ...current.checklist_json, [item]: event.target.checked },
                      }))}
                      type="checkbox"
                    />
                    <span>{item.replaceAll("_", " ")}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button className="button button-primary" style={{ marginTop: 16 }} disabled={!canEdit} type="submit">
            Save incident
          </button>
        </form>

        <div className="field-stack">
          {incidents.map((incident) => (
            <div className="review-panel" key={incident.id}>
              <div className="review-panel-label">AI-Generated - Pending Review</div>
              <div className="section-row">
                <div>
                  {serviceIdByName[incident.service_name] ? (
                    <Link className="service-card-title" to={`/registry/${serviceIdByName[incident.service_name]}`}>
                      {incident.service_name}
                    </Link>
                  ) : (
                    <div className="service-card-title">{incident.service_name}</div>
                  )}
                  <div className="badge-row" style={{ marginTop: 8 }}>
                    <span className={`status-badge ${incident.severity === "critical" || incident.severity === "high" ? "status-badge--critical" : incident.severity === "medium" ? "status-badge--warning" : "status-badge--neutral"}`}>
                      {incident.severity}
                    </span>
                    <span className={`status-badge ${incident.approved ? "status-badge--healthy" : "status-badge--warning"}`}>
                      {incident.approved ? "Approved" : "Pending review"}
                    </span>
                  </div>
                </div>
                <div className="mono">{new Date(incident.created_at).toLocaleString()}</div>
              </div>
              <div className="section-copy" style={{ marginTop: 0 }}>{incident.symptoms}</div>
              <div className="section-copy" style={{ marginTop: 0 }}>Timeline: {incident.timeline}</div>
              <div>
                <div className="field-label">Draft Review Panel</div>
                <textarea
                  className="textarea"
                  style={{ marginTop: 10, minHeight: 180 }}
                  disabled={!canEdit}
                  value={drafts[incident.id] ?? incident.llm_summary ?? "No draft generated yet."}
                  onChange={(event) => setDrafts((current) => ({ ...current, [incident.id]: event.target.value }))}
                />
              </div>
              <div className="button-row">
                <button className="button button-secondary" disabled={!canEdit || !anthropicReady} onClick={() => handleGenerateSummary(incident.id)} title={anthropicReady ? "" : "Set ANTHROPIC_API_KEY in server/.env to enable summary generation."} type="button">
                  Generate summary
                </button>
                <button className="button button-primary" disabled={!canEdit || !drafts[incident.id]} onClick={() => handleApprove(incident.id)} type="button">
                  Approve
                </button>
                </div>
              </div>
          ))}
        </div>
      </div>

      {status ? <div className="status-message">{status}</div> : null}
    </section>
  );
}