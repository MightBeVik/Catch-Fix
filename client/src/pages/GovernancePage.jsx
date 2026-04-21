import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import {
  clearOperationalData,
  downloadComplianceExport,
  fetchAuditLog,
  fetchPolicy,
  fetchRoles,
  fetchRuntimeStatus,
  reseedDemoData,
  resetDemoData,
  runEvaluationCycle,
  setSchedulerState,
} from "../api/governance";
import { isAdmin } from "../lib/roles";

export function GovernancePage() {
  const { role } = useOutletContext();
  const [roles, setRoles] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [runtime, setRuntime] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");
  const [status, setStatus] = useState("");
  const adminEnabled = isAdmin(role);

  async function load(order = sortOrder) {
    const [roleData, policyData, auditData, runtimeData] = await Promise.all([
      fetchRoles(),
      fetchPolicy(),
      fetchAuditLog(order),
      fetchRuntimeStatus(),
    ]);
    setRoles(roleData.roles || []);
    setPolicy(policyData);
    setAuditLog(auditData.items || []);
    setRuntime(runtimeData);
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
  }, []);

  async function handleSort(order) {
    setSortOrder(order);
    try {
      await load(order);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleExport() {
    try {
      await downloadComplianceExport();
      setStatus("Compliance export downloaded.");
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

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h3 className="page-title">Governance and Compliance</h3>
          <p className="page-description">
            Demo role switching, audit visibility, data handling policy disclosure, and compliance evidence export.
          </p>
        </div>
        <button className="button button-primary" onClick={handleExport} type="button">
          Export compliance JSON
        </button>
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
                <div className="field-label">{key.replaceAll("_", " ")}</div>
                <div className="section-copy" style={{ marginTop: 8 }}>{Array.isArray(value) ? value.join(", ") : value}</div>
              </div>
            )) : null}
          </div>
        </div>
      </div>

      <div className="split-layout" style={{ gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)" }}>
        <div className="panel">
          <div className="section-row">
            <h4 className="section-title">Runtime and Scheduler</h4>
            <button className="button button-secondary" onClick={() => load(sortOrder)} type="button">
              Refresh runtime
            </button>
          </div>
          {runtime ? (
            <div className="runtime-grid" style={{ marginTop: 16 }}>
              <div className="panel-elevated" style={{ padding: "14px 16px" }}>
                <div className="field-label">LLM routing runtime</div>
                <div className="field-stack" style={{ marginTop: 12 }}>
                  <div>Supported providers: {(runtime.runtime.supported_providers || []).map((provider) => provider.name).join(", ")}</div>
                  <div>Anthropic secret loaded: {runtime.runtime.secrets?.ANTHROPIC_API_KEY ? "yes" : "no"}</div>
                  <div>OpenAI secret loaded: {runtime.runtime.secrets?.OPENAI_API_KEY ? "yes" : "no"}</div>
                  <div>Timeout: {runtime.runtime.request_timeout_ms} ms</div>
                  <div>Retries: {runtime.runtime.request_max_retries}</div>
                  <div>Drift threshold: {runtime.runtime.drift_threshold}</div>
                </div>
              </div>
              <div className="panel-elevated" style={{ padding: "14px 16px" }}>
                <div className="field-label">Scheduler status</div>
                <div className="field-stack" style={{ marginTop: 12 }}>
                  <div>Enabled: {runtime.scheduler.enabled ? "yes" : "no"}</div>
                  <div>Running: {runtime.scheduler.running ? "yes" : "no"}</div>
                  <div>Schedule: {runtime.scheduler.schedule}</div>
                  <div>Last status: {runtime.scheduler.last_run_status}</div>
                  <div>Last service count: {runtime.scheduler.last_run_service_count}</div>
                  <div>Last started: {runtime.scheduler.last_run_started_at || "never"}</div>
                  <div>Last completed: {runtime.scheduler.last_run_completed_at || "never"}</div>
                </div>
              </div>
              <div className="panel-elevated" style={{ padding: "14px 16px", gridColumn: "1 / -1" }}>
                <div className="field-label">Operational counts</div>
                <div className="stat-grid" style={{ marginTop: 12 }}>
                  {Object.entries(runtime.counts).map(([key, value]) => (
                    <div className="stat-tile" key={key}>
                      <div className="field-label">{key.replaceAll("_", " ")}</div>
                      <div className="stat-tile-value">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
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
          {!adminEnabled ? <p className="section-copy" style={{ marginTop: 12 }}>Only the Admin role can use control-plane actions.</p> : null}
        </div>
      </div>

      <div className="table-shell">
        <div className="section-row" style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
          <h4 className="section-title">Audit log</h4>
          <div className="button-row">
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
                <td className="mono">{entry.timestamp}</td>
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