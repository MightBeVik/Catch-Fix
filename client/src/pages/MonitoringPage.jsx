import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { fetchDashboard, fetchEvaluations, fetchGoldenDataset, runEvaluation } from "../api/monitoring";

const CATEGORY_LABELS = {
  formatting_correctness: "Formatting",
  policy_adherence: "Policy / PII",
  judge_quality: "Judge Quality",
  reasoning_logic: "Reasoning & Logic",
  domain_knowledge: "Domain Knowledge",
  safety_refusals: "Safety & Refusals",
  instruction_following: "Instruction Following",
};

const CATEGORY_DESCRIPTIONS = {
  formatting_correctness: "Did the model return valid structured output?",
  policy_adherence: "Did the model expose PII or violate data policies?",
  judge_quality: "Did the model output match expected operational facts?",
  reasoning_logic: "Can the model solve logic and reasoning problems?",
  domain_knowledge: "Does the model understand AI/ML domain concepts?",
  safety_refusals: "Does the model refuse harmful or adversarial prompts?",
  instruction_following: "Does the model follow precise format instructions?",
};

export function MonitoringPage() {
  const { canEdit } = useOutletContext();
  const [dashboard, setDashboard] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [runningServiceId, setRunningServiceId] = useState(null);
  const [evalResult, setEvalResult] = useState(null);
  const [goldenQuestions, setGoldenQuestions] = useState([]);
  const [error, setError] = useState("");

  const serviceNameById = Object.fromEntries((dashboard?.services || []).map((s) => [s.id, s.name]));

  async function load() {
    const [dashboardData, evaluationsData] = await Promise.all([fetchDashboard(), fetchEvaluations()]);
    setDashboard(dashboardData);
    setEvaluations(evaluationsData.items || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    fetchGoldenDataset().then((data) => setGoldenQuestions(data.questions || [])).catch(() => {});
  }, []);

  async function handleRun(serviceId) {
    setRunningServiceId(serviceId);
    setEvalResult(null);
    setError("");
    try {
      const result = await runEvaluation(serviceId);
      setEvalResult(result);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunningServiceId(null);
    }
  }

  const driftedServices = (dashboard?.services || []).filter((s) => s.drift_flagged);
  const avgQuality = Number(dashboard?.stats.avg_quality_score ?? 0);

  function getServiceStatus(service) {
    const metric = service.latest_metric;
    if (!metric) return { label: "Unknown", badgeClass: "status-badge status-badge--neutral", dotClass: "status-dot" };
    if (service.drift_flagged || metric.error_rate >= 50 || metric.quality_score < 70)
      return { label: "Critical", badgeClass: "status-badge status-badge--critical", dotClass: "status-dot status-dot--critical" };
    if (metric.quality_score < 90 || metric.error_rate > 0)
      return { label: "Warning", badgeClass: "status-badge status-badge--warning", dotClass: "status-dot status-dot--warning" };
    return { label: "Healthy", badgeClass: "status-badge status-badge--healthy", dotClass: "status-dot status-dot--live" };
  }

  function metricTone(value, thresholds) {
    if (value >= thresholds.good) return "green";
    if (value >= thresholds.warn) return "yellow";
    return "red";
  }

  function scoreBadgeClass(score) {
    if (score >= 90) return "status-badge status-badge--healthy";
    if (score >= 70) return "status-badge status-badge--warning";
    return "status-badge status-badge--critical";
  }

  const goldenCategories = ["reasoning_logic", "domain_knowledge", "safety_refusals", "instruction_following"];

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h3 className="page-title">Monitoring Dashboard</h3>
          <p className="page-description">
            Live quality tracking, drift detection, and LLM evaluation runs across all registered services.
          </p>
        </div>
      </div>

      {driftedServices.length ? (
        <div className="callout callout--danger">
          <span className="status-dot status-dot--critical" />
          <div>
            <p className="field-label">Quality Drift Detected</p>
            <div className="section-copy" style={{ marginTop: 4 }}>
              Quality drift detected on {driftedServices.map((s) => s.name).join(", ")}.
            </div>
          </div>
        </div>
      ) : null}

      <div className="metric-grid">
        <div className="metric-card metric-card--blue">
          <p className="metric-label">Services</p>
          <div className="metric-value">{dashboard?.stats.total_services ?? 0}</div>
          <div className="metric-subvalue">Registered AI services under active observation</div>
        </div>
        <div className={`metric-card metric-card--${avgQuality >= 90 ? "green" : avgQuality >= 70 ? "yellow" : "red"}`}>
          <p className="metric-label">Average Quality</p>
          <div className="metric-value">{dashboard?.stats.avg_quality_score ?? "--"}</div>
          <div className="metric-subvalue">Across the most recent stored evaluations</div>
        </div>
        <div className={`metric-card metric-card--${dashboard?.stats.drift_services ? "red" : "green"}`}>
          <p className="metric-label">Drift Flags</p>
          <div className="metric-value">{dashboard?.stats.drift_services ?? 0}</div>
          <div className="metric-subvalue">Services currently below the quality threshold</div>
        </div>
        <div className="metric-card metric-card--blue">
          <p className="metric-label">Threshold</p>
          <div className="metric-value">{dashboard?.threshold ?? 70}</div>
          <div className="metric-subvalue">Minimum acceptable composite quality score</div>
        </div>
      </div>

      {/* Services table */}
      <div className="panel-sharp">
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th>Quality</th>
              <th>Latency</th>
              <th>Error Rate</th>
              <th>Last Evaluated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(dashboard?.services || []).map((service) => {
              const serviceStatus = getServiceStatus(service);
              const isRunning = runningServiceId === service.id;
              return (
                <tr key={service.id}>
                  <td>
                    <Link className="mono" style={{ color: "var(--text-primary)", fontWeight: 600 }} to={`/registry/${service.id}`}>
                      {service.name}
                    </Link>
                    <div className="muted" style={{ marginTop: 4 }}>{service.owner}</div>
                  </td>
                  <td>
                    <span className={serviceStatus.badgeClass}>
                      <span className={serviceStatus.dotClass} />
                      {serviceStatus.label}
                    </span>
                  </td>
                  <td className="mono">{service.latest_metric?.quality_score ?? "--"}</td>
                  <td className="mono">{service.latest_metric?.latency_ms ? `${service.latest_metric.latency_ms}ms` : "--"}</td>
                  <td className="mono">{service.latest_metric?.error_rate !== undefined ? `${service.latest_metric.error_rate}%` : "--"}</td>
                  <td className="mono">{service.latest_metric?.timestamp ?? "Never"}</td>
                  <td>
                    <button
                      className="button button-primary"
                      disabled={!canEdit || !service.connection_ready || runningServiceId !== null}
                      onClick={() => handleRun(service.id)}
                      title={service.connection_ready ? "" : service.connection_message}
                      type="button"
                      style={{ minWidth: 140 }}
                    >
                      {isRunning ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="status-dot status-dot--live" style={{ flexShrink: 0 }} />
                          Running…
                        </span>
                      ) : "Run evaluation"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Eval results panel */}
      {evalResult && (
        <div className="panel-sharp" style={{ borderColor: evalResult.drift_flagged ? "var(--danger)" : "var(--success)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Evaluation Results — {evalResult.service.name}
              </h4>
              <p className="muted" style={{ marginTop: 4 }}>
                {evalResult.service.model_name} · {evalResult.metric?.latency_ms}ms response time
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <div className="metric-label">Overall Score</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: evalResult.quality_score >= 90 ? "var(--success)" : evalResult.quality_score >= 70 ? "var(--warning)" : "var(--danger)" }}>
                  {evalResult.quality_score}
                </div>
              </div>
              <span className={`status-badge ${evalResult.drift_flagged ? "status-badge--critical" : "status-badge--healthy"}`}>
                <span className={`status-dot ${evalResult.drift_flagged ? "status-dot--critical" : "status-dot--live"}`} />
                {evalResult.drift_flagged ? "Drift detected" : "Healthy"}
              </span>
              <button className="button" onClick={() => setEvalResult(null)} type="button" style={{ marginLeft: 8 }}>
                Dismiss
              </button>
            </div>
          </div>

          {/* Base evals (formatting, policy, judge) */}
          <div>
            <p className="field-label" style={{ marginBottom: 12 }}>System Checks</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
              {evalResult.evaluations
                .filter((e) => !goldenCategories.includes(e.category))
                .map((e) => (
                  <div key={e.id} style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: 16, border: `1px solid ${e.score >= 70 ? "var(--border)" : "var(--danger)"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{CATEGORY_LABELS[e.category] || e.category}</span>
                      <span className={scoreBadgeClass(e.score)}>{e.score}</span>
                    </div>
                    <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{CATEGORY_DESCRIPTIONS[e.category]}</p>
                    {e.result_details?.message && (
                      <p style={{ fontSize: 12, color: e.score >= 70 ? "var(--text-secondary)" : "var(--danger)" }}>
                        {e.result_details.message}
                      </p>
                    )}
                    {e.result_details?.reasoning && (
                      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{e.result_details.reasoning}</p>
                    )}
                    {e.result_details?.output_preview && (
                      <pre style={{ marginTop: 8, fontSize: 11, background: "var(--bg-primary)", padding: 8, borderRadius: 4, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text-secondary)", maxHeight: 100, overflow: "auto" }}>
                        {e.result_details.output_preview}
                      </pre>
                    )}
                  </div>
                ))}
            </div>

            {/* Golden dataset evals — show all 5 questions per category, highlight tested one */}
            <p className="field-label" style={{ marginBottom: 12 }}>Golden Dataset — 1 Question Sampled Per Category This Run</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {goldenCategories.map((cat) => {
                const testedEval = evalResult.evaluations.find((e) => e.category === cat);
                const allQuestions = goldenQuestions.filter((q) => q.category === cat);
                return (
                  <div key={cat} style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: 16, border: `1px solid ${testedEval && testedEval.score < 70 ? "var(--danger)" : "var(--border)"}` }}>
                    {/* Category header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{CATEGORY_LABELS[cat]}</span>
                      {testedEval && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <span className={scoreBadgeClass(testedEval.score)}>{testedEval.score}</span>
                          <span className={`status-badge ${testedEval.result_details?.passed ? "status-badge--healthy" : "status-badge--critical"}`}>
                            {testedEval.result_details?.passed ? "Pass" : "Fail"}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>{CATEGORY_DESCRIPTIONS[cat]}</p>

                    {/* All 5 questions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: testedEval ? 14 : 0 }}>
                      {allQuestions.map((q, idx) => {
                        const isTested = testedEval?.result_details?.question_id === q.id;
                        return (
                          <div key={q.id} style={{
                            display: "flex", gap: 10, alignItems: "flex-start",
                            padding: "8px 10px", borderRadius: 6,
                            background: isTested ? "var(--bg-primary)" : "transparent",
                            border: isTested ? "1px solid var(--border-strong, var(--border))" : "1px solid transparent",
                          }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", minWidth: 18, paddingTop: 1 }}>Q{idx + 1}</span>
                            <span style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5, flex: 1 }}>{q.prompt}</span>
                            {isTested && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent, #6366f1)", flexShrink: 0, paddingTop: 2 }}>TESTED</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Result for tested question */}
                    {testedEval && (
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
                        {testedEval.result_details?.output_preview && (
                          <div style={{ marginBottom: 10 }}>
                            <p className="field-label" style={{ fontSize: 11, marginBottom: 4 }}>Model Response</p>
                            <pre style={{ fontSize: 12, background: "var(--bg-primary)", padding: 10, borderRadius: 4, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text-primary)", maxHeight: 120, overflow: "auto", margin: 0 }}>
                              {testedEval.result_details.output_preview}
                            </pre>
                          </div>
                        )}
                        {testedEval.result_details?.reasoning && (
                          <div>
                            <p className="field-label" style={{ fontSize: 11, marginBottom: 4 }}>Judge Reasoning</p>
                            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                              {testedEval.result_details.reasoning}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {error && <div className="callout callout--danger" style={{ marginTop: 16 }}>{error}</div>}

      {/* Eval history table */}
      <div className="panel-sharp">
        <p className="field-label" style={{ marginBottom: 12 }}>Recent Evaluation History</p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Category</th>
              <th>Score</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((evaluation) => (
              <tr key={evaluation.id}>
                <td>
                  <Link className="mono" style={{ color: "var(--text-primary)", fontWeight: 600 }} to={`/registry/${evaluation.service_id}`}>
                    {serviceNameById[evaluation.service_id] || `Service #${evaluation.service_id}`}
                  </Link>
                </td>
                <td>{CATEGORY_LABELS[evaluation.category] || evaluation.category}</td>
                <td>
                  <span className={scoreBadgeClass(evaluation.score)}>
                    {evaluation.score}
                  </span>
                </td>
                <td className="mono">{evaluation.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
