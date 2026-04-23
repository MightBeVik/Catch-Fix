import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { approvePlan, cancelPlan, completePlan, createMaintenancePlan, draftRollbackPlan, fetchMaintenancePlans, updateMaintenancePlan } from "../api/maintenance";
import { fetchServices } from "../api/registry";
import { formatMDT } from "../lib/time";

const blankPlan = {
  service_id: 0,
  next_eval_time: "",
  risk_level: "medium",
  rollback_plan: "",
  validation_steps: "",
  eval_mode: "full",
};

const STATUS_CONFIG = {
  pending:   { label: "Pending",   badge: "status-badge--warning", dot: "" },
  approved:  { label: "Approved",  badge: "status-badge--healthy", dot: "status-dot--live" },
  completed: { label: "Completed", badge: "status-badge--neutral", dot: "" },
  cancelled: { label: "Cancelled", badge: "status-badge--critical", dot: "" },
};

export function MaintenancePage() {
  const { canEdit } = useOutletContext();
  const [plans, setPlans] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(blankPlan);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  async function load() {
    const [planData, serviceData] = await Promise.all([
      fetchMaintenancePlans({ includeArchived: showArchived }),
      fetchServices(),
    ]);
    setPlans(planData.items || []);
    setServices(serviceData.items || []);
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
  }, [showArchived]);

  useEffect(() => {
    if (!form.service_id && services[0]) {
      setForm((current) => ({ ...current, service_id: services[0].id }));
    }
  }, [form.service_id, services]);

  const serviceNameById = Object.fromEntries(services.map((s) => [s.id, s.name]));
  const selectedService = services.find((s) => s.id === Number(form.service_id));

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      if (editingId) {
        await updateMaintenancePlan(editingId, form);
        setStatus("Plan updated.");
      } else {
        await createMaintenancePlan(form);
        setStatus("Plan created.");
      }
      setEditingId(null);
      setForm({ ...blankPlan, service_id: services[0]?.id || 0 });
      await load();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleDraftRollback() {
    try {
      const service = services.find((s) => s.id === Number(form.service_id));
      const result = await draftRollbackPlan({
        service_id: Number(form.service_id),
        service_name: service?.name || "Unknown service",
        risk_level: form.risk_level,
        validation_steps: form.validation_steps || "Not yet specified.",
      });
      setForm((current) => ({ ...current, rollback_plan: result.rollback_plan }));
      setStatus("Rollback draft generated. Review before saving.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleAction(action, id) {
    try {
      if (action === "approve") await approvePlan(id);
      if (action === "complete") await completePlan(id);
      if (action === "cancel") await cancelPlan(id);
      setStatus(`Plan ${action}d.`);
      await load();
    } catch (error) {
      setStatus(error.message);
    }
  }

  function startEdit(plan) {
    setEditingId(plan.id);
    setForm({
      service_id: plan.service_id,
      next_eval_time: plan.next_eval_time,
      risk_level: plan.risk_level,
      rollback_plan: plan.rollback_plan,
      validation_steps: plan.validation_steps,
      eval_mode: plan.eval_mode || "full",
    });
  }

  return (
    <section className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 className="page-title">Maintenance Planner</h3>
          <p className="page-description">
            Schedule evaluations, capture risk and rollback details. Pending → Approved → Completed.
          </p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          style={{ marginTop: 4, flexShrink: 0 }}
        >
          {showArchived ? "Hide Archived" : "Show Archived"}
        </button>
      </div>

      <div className="split-layout" style={{ gridTemplateColumns: "minmax(340px, 380px) minmax(0, 1fr)" }}>

        {/* ── Create / Edit form ── */}
        <form className="panel" onSubmit={handleSubmit}>
          <h4 className="section-title">{editingId ? "Edit plan" : "Create plan"}</h4>
          <div className="field-stack" style={{ marginTop: 16 }}>

            <label className="field">
              <span className="field-label">Service</span>
              <select className="select" disabled={!canEdit} value={form.service_id} onChange={(e) => setForm((c) => ({ ...c, service_id: Number(e.target.value) }))}>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Scheduled eval time</span>
              <input className="input" disabled={!canEdit} type="datetime-local" value={form.next_eval_time} onChange={(e) => setForm((c) => ({ ...c, next_eval_time: e.target.value }))} />
              <span style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                Plan auto-completes when this time passes and the cron job runs.
              </span>
            </label>

                    <label className="field">
              <span className="field-label">Risk level</span>
              <select className="select" disabled={!canEdit} value={form.risk_level} onChange={(e) => setForm((c) => ({ ...c, risk_level: e.target.value }))}>
                {["low", "medium", "high"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Evaluation mode</span>
              <div style={{ display: "flex", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
                {["mini", "full"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setForm((c) => ({ ...c, eval_mode: mode }))}
                    style={{
                      flex: 1, padding: "8px 0", border: "none",
                      borderRight: mode === "mini" ? "1px solid var(--border)" : "none",
                      background: form.eval_mode === mode ? "var(--accent-blue)" : "var(--bg-elevated)",
                      color: form.eval_mode === mode ? "#fff" : "var(--text-secondary)",
                      fontWeight: form.eval_mode === mode ? 600 : 400,
                      cursor: canEdit ? "pointer" : "not-allowed",
                      fontSize: 13, textTransform: "capitalize",
                    }}
                  >
                    {mode === "mini" ? "Mini (4 questions)" : "Full (20 questions)"}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                Which evaluation runs when this plan's scheduled time arrives.
              </span>
            </label>

            <label className="field">
              <span className="field-label">Validation steps</span>
              <textarea className="textarea" disabled={!canEdit} placeholder="Steps to validate success..." value={form.validation_steps} onChange={(e) => setForm((c) => ({ ...c, validation_steps: e.target.value }))} />
            </label>

            <label className="field">
              <span className="field-label">Rollback plan</span>
              <textarea className="textarea" disabled={!canEdit} placeholder="What to do if things go wrong..." value={form.rollback_plan} onChange={(e) => setForm((c) => ({ ...c, rollback_plan: e.target.value }))} />
            </label>

          </div>
          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="button button-primary" disabled={!canEdit} type="submit">
              {editingId ? "Save changes" : "Create plan"}
            </button>
            <button
              className="button button-secondary"
              disabled={!canEdit || !selectedService?.connection_ready}
              onClick={handleDraftRollback}
              title={selectedService?.connection_ready ? "" : selectedService?.connection_message || "Select a configured service."}
              type="button"
            >
              Draft rollback
            </button>
            {editingId && (
              <button className="button" type="button" onClick={() => { setEditingId(null); setForm({ ...blankPlan, service_id: services[0]?.id || 0 }); }}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* ── Plan cards ── */}
        <div className="field-stack">
          {plans.length === 0 && (
            <div className="panel" style={{ textAlign: "center", color: "var(--text-secondary)", padding: 32 }}>
              {showArchived ? "No plans found." : "No active plans."}
            </div>
          )}
          {plans.map((plan) => {
            const cfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.pending;
            const isArchived = plan.status === "completed" || plan.status === "cancelled";
            const isOverdue = plan.status === "approved" && new Date(plan.next_eval_time) < new Date();

            return (
              <div className="panel" key={plan.id} style={{ opacity: isArchived ? 0.65 : 1 }}>

                {/* Header */}
                <div className="section-row">
                  <div>
                    <Link className="service-card-title" to={`/registry/${plan.service_id}`}>
                      {serviceNameById[plan.service_id] || `Service #${plan.service_id}`}
                    </Link>
                    <div className="badge-row" style={{ marginTop: 8 }}>
                      <span className={`status-badge ${plan.risk_level === "high" ? "status-badge--critical" : plan.risk_level === "medium" ? "status-badge--warning" : "status-badge--healthy"}`}>
                        {plan.risk_level} risk
                      </span>
                      <span className={`status-badge ${cfg.badge}`}>
                        {cfg.dot && <span className={`status-dot ${cfg.dot}`} />}
                        {cfg.label}
                      </span>
                      <span className="status-badge status-badge--neutral" style={{ textTransform: "capitalize" }}>
                        {plan.eval_mode || "full"} eval
                      </span>
                      {isOverdue && (
                        <span className="status-badge status-badge--critical">Overdue</span>
                      )}
                    </div>
                  </div>
                  {!isArchived && (
                    <button className="button button-secondary" disabled={!canEdit} onClick={() => startEdit(plan)} type="button" style={{ flexShrink: 0 }}>
                      Edit
                    </button>
                  )}
                </div>

                {/* Status flow */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "12px 0 8px" }}>
                  {["pending", "approved", "completed"].map((step, i, arr) => (
                    <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: (plan.status === "cancelled" ? ["pending","approved","completed"].indexOf(plan.status) : ["pending","approved","completed"].indexOf(plan.status)) >= i || plan.status === "completed" || (plan.status === "approved" && i <= 1) || (plan.status === "pending" && i === 0) ? "var(--status-green)" : "var(--border)", flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: plan.status === step ? 700 : 400, textTransform: "capitalize" }}>{step}</span>
                      {i < arr.length - 1 && <span style={{ color: "var(--border)", fontSize: 11, margin: "0 2px" }}>→</span>}
                    </div>
                  ))}
                  {plan.status === "cancelled" && (
                    <span style={{ fontSize: 11, color: "var(--status-red)", marginLeft: 8, fontWeight: 600 }}>✕ Cancelled</span>
                  )}
                </div>

                {/* Timestamps */}
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
                  <div>
                    <div className="field-label" style={{ fontSize: 11 }}>Created</div>
                    <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>{formatMDT(plan.created_at)}</div>
                  </div>
                  <div>
                    <div className="field-label" style={{ fontSize: 11 }}>Scheduled Eval</div>
                    <div className="mono" style={{ fontSize: 12, marginTop: 2, color: isOverdue ? "var(--status-red)" : "inherit" }}>
                      {formatMDT(plan.next_eval_time)}
                    </div>
                  </div>
                  {plan.completed_at && (
                    <div>
                      <div className="field-label" style={{ fontSize: 11 }}>{plan.status === "cancelled" ? "Cancelled" : "Completed"}</div>
                      <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>{formatMDT(plan.completed_at)}</div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="runtime-grid">
                  <div className="panel-elevated" style={{ padding: "12px 14px" }}>
                    <div className="field-label">Rollback plan</div>
                    <div className="section-copy" style={{ marginTop: 6 }}>{plan.rollback_plan}</div>
                  </div>
                  <div className="panel-elevated" style={{ padding: "12px 14px" }}>
                    <div className="field-label">Validation steps</div>
                    <div className="section-copy" style={{ marginTop: 6 }}>{plan.validation_steps}</div>
                  </div>
                </div>

                {/* Actions */}
                {!isArchived && (
                  <div className="button-row" style={{ marginTop: 14 }}>
                    {plan.status === "pending" && (
                      <button className="button button-primary" disabled={!canEdit} onClick={() => handleAction("approve", plan.id)} type="button">
                        Approve
                      </button>
                    )}
                    {plan.status === "approved" && (
                      <button
                        className="button button-primary"
                        disabled={!canEdit}
                        onClick={() => handleAction("complete", plan.id)}
                        type="button"
                        style={{ background: "var(--status-green)", borderColor: "var(--status-green)" }}
                      >
                        Mark Complete
                      </button>
                    )}
                    <button className="button button-danger" disabled={!canEdit} onClick={() => handleAction("cancel", plan.id)} type="button">
                      Cancel
                    </button>
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
