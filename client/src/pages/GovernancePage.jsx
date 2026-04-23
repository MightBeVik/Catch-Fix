import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { formatMDT } from "../lib/time";

import {
  clearOperationalData,
  downloadComplianceExport,
  fetchAuditLog,
  fetchPolicy,
  fetchRoles,
  reseedDemoData,
  resetDemoData,
  runEvaluationCycle,
  setSchedulerState,
  updatePolicy,
} from "../api/governance";
import { fetchMaintenancePlans } from "../api/maintenance";
import { fetchUsers } from "../api/users";
import { isAdmin } from "../lib/roles";

export function GovernancePage() {
  const { role } = useOutletContext();
  const [roles, setRoles] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [maintenancePlans, setMaintenancePlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ action: "", role: "", startDate: "", endDate: "" });
  const [exportRange, setExportRange] = useState({ startDate: "", endDate: "" });
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [status, setStatus] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const adminEnabled = isAdmin(role);

  async function load(order = sortOrder, currentFilters = filters) {
    const [roleData, policyData, auditData, maintenanceData, userData] = await Promise.all([
      fetchRoles(),
      fetchPolicy(),
      fetchAuditLog({ order, ...currentFilters }),
      fetchMaintenancePlans({ includeArchived: false }),
      adminEnabled ? fetchUsers() : Promise.resolve({ items: [] }),
    ]);
    setRoles(roleData.roles || []);
    setPolicy(policyData);
    setAuditLog(auditData.items || []);
    setMaintenancePlans(maintenanceData.items || []);
    setUsers(userData.items || []);
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
  }, []);

  async function handleSort(order) {
    setSortOrder(order);
    try {
      await load(order, filters);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleFilter(newFilters) {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    try {
      await load(sortOrder, updated);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleExport() {
    try {
      await downloadComplianceExport(exportRange);
      setStatus("Compliance export downloaded.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handlePolicyUpdate(key, value) {
    try {
      await updatePolicy(key, value);
      setEditingPolicy(null);
      await load(sortOrder, filters);
      setStatus("Policy updated.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleAdminAction(action) {
    try {
      if (action === "reseed") {
        await reseedDemoData();
        setStatus("Demo data reseeded without clearing existing records.");
      }
      if (action === "reset") {
        await resetDemoData();
        setStatus("Operational data reset and demo data reseeded.");
      }
      if (action === "clear") {
        await clearOperationalData();
        setStatus("Operational data cleared.");
      }
      if (action === "run") {
        await runEvaluationCycle();
        setStatus("Evaluation cycle executed from the governance console.");
      }
      if (action === "pause") {
        await setSchedulerState("pause");
        setStatus("Scheduler paused.");
      }
      if (action === "resume") {
        await setSchedulerState("resume");
        setStatus("Scheduler resumed.");
      }
      await load(sortOrder);
    } catch (error) {
      setStatus(error.message);
    }
  }

  const activePlans = maintenancePlans.filter(
    (p) => p.status === "pending" || p.status === "approved"
  );

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h3 className="page-title">Governance and Compliance</h3>
          <p className="page-description">
            Demo role switching, audit visibility, data handling policy disclosure, and compliance evidence export.
          </p>
        </div>
        <div className="button-row" style={{ alignItems: "flex-end" }}>
          <div className="field-stack" style={{ minWidth: 140 }}>
            <div className="field-label" style={{ fontSize: 11 }}>Export Start</div>
            <input
              className="input"
              type="date"
              value={exportRange.startDate}
              onChange={(e) => setExportRange({ ...exportRange, startDate: e.target.value })}
            />
          </div>
          <div className="field-stack" style={{ minWidth: 140 }}>
            <div className="field-label" style={{ fontSize: 11 }}>Export End</div>
            <input
              className="input"
              type="date"
              value={exportRange.endDate}
              onChange={(e) => setExportRange({ ...exportRange, endDate: e.target.value })}
            />
          </div>
          <button className="button button-primary" onClick={handleExport} type="button">
            Export compliance JSON
          </button>
        </div>
      </div>

      <div className="info-grid">
        <div className="panel">
          <h4 className="section-title">Role access model</h4>
          <div className="field-stack" style={{ marginTop: 16 }}>
            {roles.map((item) => (
              <div className="panel-elevated" style={{ padding: "14px 16px" }} key={item}>
                <div className="service-card-title" style={{ fontSize: 16 }}>{item}</div>
                <div className="muted" style={{ marginTop: 4 }}>Current selected role: {role}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h4 className="section-title">Data handling policy</h4>
          <div className="field-stack" style={{ marginTop: 16 }}>
            {policy ? Object.entries(policy).map(([key, value]) => (
              <div className="panel-elevated" style={{ padding: "14px 16px" }} key={key}>
                <div className="section-row">
                  <div className="field-label">{key.replaceAll("_", " ")}</div>
                  {adminEnabled && (
                    <button
                      className="button button-secondary"
                      onClick={() => setEditingPolicy({ key, value: Array.isArray(value) ? value.join(", ") : value })}
                      style={{ padding: "4px 8px", fontSize: 11 }}
                      type="button"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {editingPolicy?.key === key ? (
                  <div className="field-stack" style={{ marginTop: 8 }}>
                    <textarea
                      className="input"
                      onChange={(e) => setEditingPolicy({ ...editingPolicy, value: e.target.value })}
                      rows={3}
                      value={editingPolicy.value}
                    />
                    <div className="button-row">
                      <button
                        className="button button-primary"
                        onClick={() => handlePolicyUpdate(key, key === "data_stored" ? editingPolicy.value.split(",").map(s => s.trim()) : editingPolicy.value)}
                        type="button"
                      >
                        Save
                      </button>
                      <button className="button button-secondary" onClick={() => setEditingPolicy(null)} type="button">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="section-copy" style={{ marginTop: 8 }}>
                    {Array.isArray(value) ? value.join(", ") : value}
                  </div>
                )}
              </div>
            )) : null}
          </div>
        </div>
      </div>

      <div className="split-layout" style={{ gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)" }}>
        <div className="panel">
          <div className="section-row">
            <h4 className="section-title">Scheduled Maintenance</h4>
            <button className="button button-secondary" onClick={() => load(sortOrder)} type="button">
              Refresh
            </button>
          </div>
          <div className="field-stack" style={{ marginTop: 16 }}>
            {activePlans.length > 0 ? activePlans.map((plan) => (
              <div className="panel-elevated" style={{ padding: "14px 16px" }} key={plan.id}>
                <div className="section-row">
                  <div className="service-card-title" style={{ fontSize: 15 }}>
                    Service #{plan.service_id}
                  </div>
                  <span className="badge">{plan.status}</span>
                </div>
                <div className="field-stack" style={{ marginTop: 8 }}>
                  <div>Next eval: {plan.next_eval_time ? formatMDT(plan.next_eval_time) : "—"}</div>
                  <div>Eval mode: {plan.eval_mode} · Risk: {plan.risk_level}</div>
                </div>
              </div>
            )) : (
              <p className="section-copy">No active maintenance plans scheduled.</p>
            )}
          </div>
        </div>

        <div className="panel">
          <h4 className="section-title">Admin Utilities</h4>
          <p className="section-copy">
            Use these controls to run evaluation cycles, pause or resume the scheduler, and manage the seeded operational dataset.
          </p>
          <div className="field-stack" style={{ marginTop: 16 }}>
            <button className="button button-secondary" disabled={!adminEnabled} onClick={() => handleAdminAction("run")} type="button">
              Run evaluation cycle now
            </button>
            <button className="button button-secondary" disabled={!adminEnabled} onClick={() => handleAdminAction("pause")} type="button">
              Pause scheduler
            </button>
            <button className="button button-secondary" disabled={!adminEnabled} onClick={() => handleAdminAction("resume")} type="button">
              Resume scheduler
            </button>
            <button className="button button-secondary" disabled={!adminEnabled} onClick={() => handleAdminAction("reseed")} type="button">
              Reseed demo data
            </button>
            <button className="button button-warning" disabled={!adminEnabled} onClick={() => handleAdminAction("reset")} type="button">
              Reset and reseed demo data
            </button>
            <button className="button button-danger" disabled={!adminEnabled} onClick={() => handleAdminAction("clear")} type="button">
              Clear operational data
            </button>
          </div>
          {!adminEnabled && (
            <p className="section-copy" style={{ marginTop: 12 }}>Only the Admin role can use control-plane actions.</p>
          )}
        </div>
      </div>

      {adminEnabled && (
        <div className="panel" style={{ marginTop: 24 }}>
          <h4 className="section-title">Active Platform Users</h4>
          <div className="table-shell" style={{ marginTop: 16 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td>{u.email}</td>
                    <td><span className="badge">{u.role}</span></td>
                    <td className="mono">{formatMDT(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="table-shell">
        <div className="section-row" style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 16 }}>
          <h4 className="section-title">Audit log</h4>
          <div className="button-row" style={{ flexWrap: "wrap" }}>
            <div className="field-stack" style={{ minWidth: 120 }}>
              <select className="input" onChange={(e) => handleFilter({ action: e.target.value })} value={filters.action}>
                <option value="">All Actions</option>
                <option value="service_created">Service Created</option>
                <option value="incident_created">Incident Created</option>
                <option value="incident_resolved">Incident Resolved</option>
                <option value="maintenance_plan_created">Maintenance Created</option>
              </select>
            </div>
            <div className="field-stack" style={{ minWidth: 100 }}>
              <select className="input" onChange={(e) => handleFilter({ role: e.target.value })} value={filters.role}>
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Maintainer">Maintainer</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            <div className="field-stack" style={{ minWidth: 140 }}>
              <input className="input" onChange={(e) => handleFilter({ startDate: e.target.value })} type="date" value={filters.startDate} />
            </div>
            <div className="field-stack" style={{ minWidth: 140 }}>
              <input className="input" onChange={(e) => handleFilter({ endDate: e.target.value })} type="date" value={filters.endDate} />
            </div>
            <button className="button button-secondary" onClick={() => handleSort("desc")} type="button">Newest first</button>
            <button className="button button-secondary" onClick={() => handleSort("asc")} type="button">Oldest first</button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Role</th>
              <th>Old Value</th>
              <th>New Value</th>
            </tr>
          </thead>
          <tbody>
            {auditLog.map((entry) => (
              <tr key={entry.id}>
                <td className="mono">{formatMDT(entry.timestamp)}</td>
                <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>{entry.action}</td>
                <td>{entry.entity_type} #{entry.entity_id}</td>
                <td className="mono">{entry.user_role}</td>
                <td><div className="audit-payload">{entry.old_value ? JSON.stringify(entry.old_value, null, 2) : "--"}</div></td>
                <td><div className="audit-payload">{entry.new_value ? JSON.stringify(entry.new_value, null, 2) : "--"}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {status ? <div className="status-message">{status}</div> : null}
    </section>
  );
}
