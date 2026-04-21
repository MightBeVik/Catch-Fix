import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { draftRollbackPlan, fetchMaintenancePlans, createMaintenancePlan, updateMaintenancePlan } from "../api/maintenance";
import { fetchServices } from "../api/registry";

const blankPlan = {
  service_id: 0,
  next_eval_time: "",
  risk_level: "medium",
  rollback_plan: "",
  validation_steps: "",
  approved: false,
};

export function MaintenancePage() {
  const { canEdit } = useOutletContext();
  const [plans, setPlans] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(blankPlan);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState("");

  async function load() {
    const [planData, serviceData] = await Promise.all([fetchMaintenancePlans(), fetchServices()]);
    setPlans(planData.items || []);
    setServices(serviceData.items || []);
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    if (!form.service_id && services[0]) {
      setForm((current) => ({ ...current, service_id: services[0].id }));
    }
  }, [form.service_id, services]);

  const serviceNameById = Object.fromEntries(services.map((service) => [service.id, service.name]));
  const selectedService = services.find((service) => service.id === Number(form.service_id));

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      if (editingId) {
        await updateMaintenancePlan(editingId, form);
        setStatus("Maintenance plan updated.");
      } else {
        await createMaintenancePlan(form);
        setStatus("Maintenance plan created.");
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
      const service = services.find((item) => item.id === Number(form.service_id));
      const result = await draftRollbackPlan({
        service_id: Number(form.service_id),
        service_name: service?.name || "Unknown service",
        risk_level: form.risk_level,
        validation_steps: form.validation_steps,
      });
      setForm((current) => ({ ...current, rollback_plan: result.rollback_plan }));
      setStatus("Rollback draft generated. Review before saving.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="page">
      <div>
        <h3 className="page-title">Maintenance Planner</h3>
        <p className="page-description">
          Schedule evaluations, capture risk and rollback details, and require explicit human approval before persistence.
        </p>
      </div>

      <div className="split-layout" style={{ gridTemplateColumns: "minmax(340px, 380px) minmax(0, 1fr)" }}>
        <form className="panel" onSubmit={handleSubmit}>
          <h4 className="section-title">{editingId ? "Edit plan" : "Create plan"}</h4>
          <div className="field-stack" style={{ marginTop: 16 }}>
            <select className="select" disabled={!canEdit} value={form.service_id} onChange={(event) => setForm((current) => ({ ...current, service_id: Number(event.target.value) }))}>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
            <input className="input" disabled={!canEdit} type="datetime-local" value={form.next_eval_time} onChange={(event) => setForm((current) => ({ ...current, next_eval_time: event.target.value }))} />
            <select className="select" disabled={!canEdit} value={form.risk_level} onChange={(event) => setForm((current) => ({ ...current, risk_level: event.target.value }))}>
              {["low", "medium", "high"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <textarea className="textarea" disabled={!canEdit} placeholder="Rollback plan" value={form.rollback_plan} onChange={(event) => setForm((current) => ({ ...current, rollback_plan: event.target.value }))} />
            <textarea className="textarea" disabled={!canEdit} placeholder="Validation steps" value={form.validation_steps} onChange={(event) => setForm((current) => ({ ...current, validation_steps: event.target.value }))} />
            <label className="checkbox-line">
              <input checked={form.approved} disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, approved: event.target.checked }))} type="checkbox" />
              Human approval confirmed
            </label>
          </div>
          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="button button-primary" disabled={!canEdit} type="submit">
              {editingId ? "Save plan" : "Create plan"}
            </button>
            <button className="button button-secondary" disabled={!canEdit || !selectedService?.connection_ready} onClick={handleDraftRollback} title={selectedService?.connection_ready ? "" : selectedService?.connection_message || "Select a configured service to draft a rollback plan."} type="button">
              Draft rollback
            </button>
          </div>
        </form>

        <div className="field-stack">
          {plans.map((plan) => (
            <div className="panel" key={plan.id}>
              <div className="section-row">
                <div>
                  <div className="service-card-title">Plan #{plan.id}</div>
                  <div className="badge-row" style={{ marginTop: 8 }}>
                    <Link className="status-badge status-badge--info" to={`/registry/${plan.service_id}`}>
                      {serviceNameById[plan.service_id] || `Service #${plan.service_id}`}
                    </Link>
                    <span className={`status-badge ${plan.risk_level === "high" ? "status-badge--critical" : plan.risk_level === "medium" ? "status-badge--warning" : "status-badge--healthy"}`}>risk {plan.risk_level}</span>
                    <span className={`status-badge ${plan.approved ? "status-badge--healthy" : "status-badge--warning"}`}>{plan.approved ? "approved" : "pending"}</span>
                  </div>
                </div>
                <button
                  className="button button-secondary"
                  disabled={!canEdit}
                  onClick={() => {
                    setEditingId(plan.id);
                    setForm({
                      service_id: plan.service_id,
                      next_eval_time: plan.next_eval_time,
                      risk_level: plan.risk_level,
                      rollback_plan: plan.rollback_plan,
                      validation_steps: plan.validation_steps,
                      approved: plan.approved,
                    });
                  }}
                  type="button"
                >
                  Edit
                </button>
              </div>
              <div className="runtime-grid" style={{ marginTop: 16 }}>
                <div className="panel-elevated" style={{ padding: "14px 16px" }}>
                  <div className="field-label">Rollback plan</div>
                  <div className="section-copy" style={{ marginTop: 8 }}>{plan.rollback_plan}</div>
                </div>
                <div className="panel-elevated" style={{ padding: "14px 16px" }}>
                  <div className="field-label">Validation steps</div>
                  <div className="section-copy" style={{ marginTop: 8 }}>{plan.validation_steps}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {status ? <div className="status-message">{status}</div> : null}
    </section>
  );
}