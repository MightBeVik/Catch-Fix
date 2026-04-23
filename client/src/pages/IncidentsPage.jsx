import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { formatMDT } from "../lib/time";

import { approveIncidentSummary, createIncident, fetchIncidents, generateIncidentSummary, resolveIncident } from "../api/incidents";
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
  const { canEdit } = useOutletContext();
  const [incidents, setIncidents] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [drafts, setDrafts] = useState({});
  const [status, setStatus] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  async function loadPage() {
    const [incidentData, serviceData] = await Promise.all([
      fetchIncidents({ includeResolved: showResolved }),
      fetchServices(),
    ]);
    setIncidents(incidentData.items || []);
    setServices(serviceData.items || []);
  }

  useEffect(() => {
    loadPage().catch((error) => setStatus(error.message));
  }, [showResolved]);

  useEffect(() => {
    if (!form.service_name && services[0]) {
      setForm((current) => ({ ...current, service_name: services[0].name }));
    }
  }, [form.service_name, services]);

  const serviceIdByName = Object.fromEntries(services.map((service) => [service.name, service.id]));
  const selectedService = services.find((service) => service.name === form.service_name);

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
      setStatus("Incident approved.");
      await loadPage();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleResolve(id) {
    try {
      await resolveIncident(id);
      setStatus("Incident resolved and removed from queue.");
      await loadPage();
    } catch (error) {
      setStatus(error.message);
    }
  }

  function incidentStatus(incident) {
    if (incident.resolved) return { label: "Resolved", color: "var(--text-secondary)", badge: "status-badge--neutral" };
    if (incident.approved) return { label: "Approved", color: "var(--status-green)", badge: "status-badge--healthy" };
    return { label: "Pending Review", color: "var(--status-yellow)", badge: "status-badge--warning" };
  }

  return (
    <section className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 className="page-title">Incident Triage</h3>
          <p className="page-description">
            Create incidents, generate AI summaries, approve, and resolve. Pending → Approved → Resolved.
          </p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => setShowResolved((v) => !v)}
          style={{ marginTop: 4, flexShrink: 0 }}
        >
          {showResolved ? "Hide Resolved" : "Show Resolved"}
        </button>
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
          {incidents.length === 0 && (
            <div className="panel" style={{ textAlign: "center", color: "var(--text-secondary)", padding: 32 }}>
              {showResolved ? "No incidents found." : "No open incidents. All clear!"}
            </div>
          )}
          {incidents.map((incident) => {
            const status = incidentStatus(incident);
            const linkedService = services.find((s) => s.name === incident.service_name);
            const isResolved = incident.resolved;
            return (
              <div className="review-panel" key={incident.id} style={{ opacity: isResolved ? 0.6 : 1 }}>

                {/* Header */}
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
                      <span className={`status-badge ${status.badge}`}>{status.label}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 12 }}>{formatMDT(incident.created_at)}</div>
                    {isResolved && incident.resolved_at && (
                      <div className="mono" style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                        Resolved {formatMDT(incident.resolved_at)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status flow indicator */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "12px 0 8px" }}>
                  {[
                    { key: "created", label: "Created", done: true },
                    { key: "approved", label: "Approved", done: incident.approved },
                    { key: "resolved", label: "Resolved", done: incident.resolved },
                  ].map((step, i, arr) => (
                    <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: step.done ? "var(--status-green)" : "var(--border)",
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 11, color: step.done ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: step.done ? 600 : 400 }}>
                        {step.label}
                      </span>
                      {i < arr.length - 1 && <span style={{ color: "var(--border)", fontSize: 11, margin: "0 2px" }}>→</span>}
                    </div>
                  ))}
                </div>

                <div className="section-copy" style={{ marginTop: 0 }}>{incident.symptoms}</div>
                <div className="section-copy" style={{ marginTop: 0 }}>Timeline: {incident.timeline}</div>

                {/* Summary panel — hidden once resolved */}
                {!isResolved && (
                  <div>
                    <div className="field-label">AI Summary Draft</div>
                    <textarea
                      className="textarea"
                      style={{ marginTop: 10, minHeight: 140 }}
                      disabled={!canEdit || incident.approved}
                      value={drafts[incident.id] ?? incident.llm_summary ?? ""}
                      placeholder="No draft yet — click Generate Summary."
                      onChange={(event) => setDrafts((current) => ({ ...current, [incident.id]: event.target.value }))}
                    />
                  </div>
                )}

                {/* Actions */}
                {!isResolved && (
                  <div className="button-row">
                    {!incident.approved && (
                      <>
                        <button
                          className="button button-secondary"
                          disabled={!canEdit || !linkedService?.connection_ready}
                          onClick={() => handleGenerateSummary(incident.id)}
                          title={linkedService?.connection_ready ? "" : linkedService?.connection_message || "Service not configured."}
                          type="button"
                        >
                          Generate Summary
                        </button>
                        <button
                          className="button button-primary"
                          disabled={!canEdit || !(drafts[incident.id] ?? incident.llm_summary)}
                          onClick={() => handleApprove(incident.id)}
                          type="button"
                        >
                          Approve
                        </button>
                      </>
                    )}
                    {incident.approved && (
                      <button
                        className="button button-primary"
                        disabled={!canEdit}
                        onClick={() => handleResolve(incident.id)}
                        type="button"
                        style={{ background: "var(--status-green)", borderColor: "var(--status-green)" }}
                      >
                        Mark as Resolved
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {status ? <div className="status-message">{status}</div> : null}
    </section>
  );
}