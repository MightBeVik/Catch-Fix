import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { fetchDashboard, fetchEvaluations, fetchGoldenDataset, runEvaluation } from "../api/monitoring";
import { formatMDT } from "../lib/time";

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
  const [runningMode, setRunningMode] = useState(null);
  const [evalResult, setEvalResult] = useState(null);
  const [evalMode, setEvalMode] = useState(null);
  const [openCategories, setOpenCategories] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [goldenQuestions, setGoldenQuestions] = useState([]);
  const [error, setError] = useState("");

  const serviceNameById = Object.fromEntries((dashboard?.services || []).map((s) => [s.id, s.name]));
  const [expandedRuns, setExpandedRuns] = useState({});

  function toggleRun(key) {
    setExpandedRuns((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const evalRuns = useMemo(() => {
    const map = new Map();
    for (const e of evaluations) {
      const key = `${e.service_id}::${e.timestamp}`;
      if (!map.has(key)) {
        map.set(key, { key, service_id: e.service_id, timestamp: e.timestamp, evals: [] });
      }
      map.get(key).evals.push(e);
    }
    return Array.from(map.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [evaluations]);

  async function load() {
    const [dashboardData, evaluationsData] = await Promise.all([fetchDashboard(), fetchEvaluations()]);
    setDashboard(dashboardData);
    setEvaluations(evaluationsData.items || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    fetchGoldenDataset().then((data) => setGoldenQuestions(data.questions || [])).catch(() => {});
  }, []);

  async function handleRun(serviceId, mode) {
    setRunningServiceId(serviceId);
    setRunningMode(mode);
    setEvalResult(null);
    setEvalMode(mode);
    setOpenCategories({ reasoning_logic: true });
    setExpandedQuestions({});
    setError("");
    try {
      const result = await runEvaluation(serviceId, mode);
      setEvalResult(result);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunningServiceId(null);
      setRunningMode(null);
    }
  }

  function toggleCategory(cat) {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  function toggleQuestion(key) {
    setExpandedQuestions((prev) => ({ ...prev, [key]: !prev[key] }));
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
              const isRunningFull = isRunning && runningMode === "full";
              const isRunningMini = isRunning && runningMode === "mini";
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
                  <td className="mono">{service.latest_metric?.timestamp ? formatMDT(service.latest_metric.timestamp) : "Never"}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button
                        className="button button-primary"
                        disabled={!canEdit || !service.connection_ready || runningServiceId !== null}
                        onClick={() => handleRun(service.id, "full")}
                        title={service.connection_ready ? "All 20 questions" : service.connection_message}
                        type="button"
                        style={{ width: "100%" }}
                      >
                        {isRunningFull ? (
                          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <span className="status-dot status-dot--live" style={{ flexShrink: 0 }} />
                            Running…
                          </span>
                        ) : "Full Evaluation"}
                      </button>
                      <button
                        className="button"
                        disabled={!canEdit || !service.connection_ready || runningServiceId !== null}
                        onClick={() => handleRun(service.id, "mini")}
                        title={service.connection_ready ? "1 question per category (4 total)" : service.connection_message}
                        type="button"
                        style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border-focus)", color: "var(--text-primary)" }}
                      >
                        {isRunningMini ? (
                          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <span className="status-dot status-dot--live" style={{ flexShrink: 0 }} />
                            Running…
                          </span>
                        ) : "Mini Evaluation"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Eval results panel */}
      {evalResult && (() => {
        const baseEvals = evalResult.evaluations.filter((e) => !goldenCategories.includes(e.category));
        const goldenEvals = evalResult.evaluations.filter((e) => goldenCategories.includes(e.category));
        const isFull = evalMode === "full";

        return (
          <div className="panel-sharp" style={{ borderColor: evalResult.drift_flagged ? "var(--danger)" : "var(--success)" }}>

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  {isFull ? "Full" : "Mini"} Evaluation — {evalResult.service.name}
                </h4>
                <p className="muted" style={{ marginTop: 4 }}>
                  {evalResult.service.model_name} · {evalResult.metric?.latency_ms}ms · {goldenEvals.length} golden question{goldenEvals.length !== 1 ? "s" : ""} evaluated
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
                <button className="button" onClick={() => setEvalResult(null)} type="button" style={{ marginLeft: 8 }}>Dismiss</button>
              </div>
            </div>

            {/* ── System Checks ── */}
            <p className="field-label" style={{ marginBottom: 12 }}>System Checks</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 28 }}>
              {baseEvals.map((e) => (
                <div key={e.id} style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: 16, border: `1px solid ${e.score >= 70 ? "var(--border)" : "var(--danger)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{CATEGORY_LABELS[e.category] || e.category}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span className={scoreBadgeClass(e.score)}>{e.score}</span>
                      <span className={`status-badge ${e.score >= 70 ? "status-badge--healthy" : "status-badge--critical"}`}>{e.score >= 70 ? "Pass" : "Fail"}</span>
                    </div>
                  </div>
                  <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{CATEGORY_DESCRIPTIONS[e.category]}</p>
                  {e.result_details?.message && (
                    <p style={{ fontSize: 12, color: e.score >= 70 ? "var(--text-secondary)" : "var(--danger)" }}>{e.result_details.message}</p>
                  )}
                  {e.result_details?.output_preview && (
                    <pre style={{ marginTop: 8, fontSize: 11, background: "var(--bg-primary)", padding: 8, borderRadius: 4, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text-secondary)", maxHeight: 80, overflow: "auto" }}>
                      {e.result_details.output_preview}
                    </pre>
                  )}
                </div>
              ))}
            </div>

            {/* ── Golden Dataset ── */}
            <p className="field-label" style={{ marginBottom: 12 }}>
              Golden Dataset — {isFull ? "Full (20 questions, 5 per category)" : `Mini (${goldenEvals.length} questions sampled)`}
            </p>

            {isFull ? (
              /* ── FULL: accordion per category ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {goldenCategories.map((cat) => {
                  const catEvals = goldenEvals.filter((e) => e.category === cat);
                  const catAvg = catEvals.length ? Math.round(catEvals.reduce((s, e) => s + e.score, 0) / catEvals.length) : 0;
                  const passed = catEvals.filter((e) => e.result_details?.passed).length;
                  const isOpen = openCategories[cat] ?? false;

                  return (
                    <div key={cat} style={{ border: `1px solid ${catAvg < 70 ? "var(--danger)" : "var(--border)"}`, borderRadius: 8, overflow: "hidden" }}>
                      {/* Accordion header */}
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-secondary)", border: "none", cursor: "pointer", textAlign: "left" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{CATEGORY_LABELS[cat]}</span>
                          <span className="muted" style={{ fontSize: 12 }}>{CATEGORY_DESCRIPTIONS[cat]}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{passed}/{catEvals.length} passed</span>
                          <span className={scoreBadgeClass(catAvg)}>{catAvg}</span>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 4 }}>{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {/* Accordion body */}
                      {isOpen && (
                        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, background: "var(--bg-primary)" }}>
                          {catEvals.map((e, idx) => {
                            const qKey = `${cat}-${idx}`;
                            const isExpanded = expandedQuestions[qKey] ?? false;
                            return (
                              <div key={e.id} style={{ border: `1px solid ${e.score >= 70 ? "var(--border)" : "var(--danger)"}`, borderRadius: 6, overflow: "hidden" }}>
                                {/* Question row */}
                                <button
                                  type="button"
                                  onClick={() => toggleQuestion(qKey)}
                                  style={{ width: "100%", display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", background: "var(--bg-secondary)", border: "none", cursor: "pointer", textAlign: "left" }}
                                >
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", minWidth: 20, paddingTop: 1, flexShrink: 0 }}>Q{idx + 1}</span>
                                  <span style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5, flex: 1 }}>{e.result_details?.question_prompt || "—"}</span>
                                  <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                                    <span className={scoreBadgeClass(e.score)}>{e.score}</span>
                                    <span className={`status-badge ${e.result_details?.passed ? "status-badge--healthy" : "status-badge--critical"}`}>{e.result_details?.passed ? "Pass" : "Fail"}</span>
                                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{isExpanded ? "▲" : "▼"}</span>
                                  </div>
                                </button>
                                {/* Expanded details */}
                                {isExpanded && (
                                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                                    {e.result_details?.output_preview && (
                                      <div>
                                        <p className="field-label" style={{ fontSize: 11, marginBottom: 4 }}>Model Response</p>
                                        <pre style={{ fontSize: 12, background: "var(--bg-secondary)", padding: 10, borderRadius: 4, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text-primary)", maxHeight: 140, overflow: "auto", margin: 0 }}>
                                          {e.result_details.output_preview}
                                        </pre>
                                      </div>
                                    )}
                                    {e.result_details?.reasoning && (
                                      <div>
                                        <p className="field-label" style={{ fontSize: 11, marginBottom: 4 }}>Judge Reasoning</p>
                                        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{e.result_details.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── MINI: flat cards, one per category ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {goldenEvals.map((e) => {
                  const qKey = `mini-${e.id}`;
                  const isExpanded = expandedQuestions[qKey] ?? false;
                  return (
                    <div key={e.id} style={{ border: `1px solid ${e.score >= 70 ? "var(--border)" : "var(--danger)"}`, borderRadius: 8, overflow: "hidden" }}>
                      {/* Question header row */}
                      <button
                        type="button"
                        onClick={() => toggleQuestion(qKey)}
                        style={{ width: "100%", display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", background: "var(--bg-secondary)", border: "none", cursor: "pointer", textAlign: "left" }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent, #6366f1)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{CATEGORY_LABELS[e.category]}</span>
                          <span style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5 }}>{e.result_details?.question_prompt || "—"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center", paddingTop: 2 }}>
                          <span className={scoreBadgeClass(e.score)}>{e.score}</span>
                          <span className={`status-badge ${e.result_details?.passed ? "status-badge--healthy" : "status-badge--critical"}`}>{e.result_details?.passed ? "Pass" : "Fail"}</span>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </button>
                      {/* Expanded response + reasoning */}
                      {isExpanded && (
                        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, background: "var(--bg-primary)" }}>
                          {e.result_details?.output_preview && (
                            <div>
                              <p className="field-label" style={{ fontSize: 11, marginBottom: 4 }}>Model Response</p>
                              <pre style={{ fontSize: 12, background: "var(--bg-secondary)", padding: 10, borderRadius: 4, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text-primary)", maxHeight: 140, overflow: "auto", margin: 0 }}>
                                {e.result_details.output_preview}
                              </pre>
                            </div>
                          )}
                          {e.result_details?.reasoning && (
                            <div>
                              <p className="field-label" style={{ fontSize: 11, marginBottom: 4 }}>Judge Reasoning</p>
                              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{e.result_details.reasoning}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {error && <div className="callout callout--danger" style={{ marginTop: 16 }}>{error}</div>}

      {/* Eval history table */}
      <div className="panel-sharp">
        <p className="field-label" style={{ marginBottom: 12 }}>Recent Evaluation History</p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Checks</th>
              <th>Passed</th>
              <th>Composite Score</th>
              <th>Timestamp</th>
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {evalRuns.map((run) => {
              const compositeScore = Math.round(run.evals.reduce((s, e) => s + e.score, 0) / run.evals.length);
              const passCount = run.evals.filter((e) => e.score >= 70).length;
              const isOpen = expandedRuns[run.key] ?? false;
              const isMini = run.evals.length <= 7;
              return (
                <>
                  <tr
                    key={run.key}
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleRun(run.key)}
                  >
                    <td>
                      <Link
                        className="mono"
                        style={{ color: "var(--text-primary)", fontWeight: 600 }}
                        to={`/registry/${run.service_id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {serviceNameById[run.service_id] || `Service #${run.service_id}`}
                      </Link>
                      <div style={{ marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 6px" }}>
                          {isMini ? "Mini" : "Full"}
                        </span>
                      </div>
                    </td>
                    <td className="mono">{run.evals.length}</td>
                    <td className="mono">{passCount} / {run.evals.length}</td>
                    <td><span className={scoreBadgeClass(compositeScore)}>{compositeScore}</span></td>
                    <td className="mono">{formatMDT(run.timestamp)}</td>
                    <td style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 12 }}>
                      {isOpen ? "▲" : "▼"}
                    </td>
                  </tr>
                  {isOpen && run.evals.map((e) => (
                    <tr key={e.id} style={{ background: "var(--bg-elevated)" }}>
                      <td style={{ paddingLeft: 28, fontSize: 12, color: "var(--text-secondary)" }}>
                        ↳ {CATEGORY_LABELS[e.category] || e.category}
                      </td>
                      <td />
                      <td className="mono" style={{ fontSize: 12 }}>
                        <span className={`status-badge ${e.score >= 70 ? "status-badge--healthy" : "status-badge--critical"}`}>
                          {e.score >= 70 ? "Pass" : "Fail"}
                        </span>
                      </td>
                      <td><span className={scoreBadgeClass(e.score)}>{e.score}</span></td>
                      <td />
                      <td />
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
