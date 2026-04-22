# MVP Plan: Catch-Fix Production Readiness

## What exists today (the gap)

The app has solid bones — auth, RBAC, audit logging, multi-provider LLM routing, human-in-the-loop flows — but **evaluations are fake**. The scheduler runs every 30min and calls real LLMs, but the scoring only checks:
1. Is the response valid JSON? (`formatting_correctness`)
2. Does it contain a phone number or email? (`policy_adherence`)

That's not a real evaluation. And all the demo services are seeded fixtures, not real AI services you own.

---

## The 3-Layer Problem

```
Layer 1: What services are being monitored?     → hardcoded seed data
Layer 2: What are we evaluating them on?        → trivial JSON + PII check
Layer 3: What do we do with the results?        → dashboard shows fake scores
```

---

## MVP Phases

---

### Phase 1 — Real Services (1–2 days)

**Goal:** Replace demo seed data with real AI services you actually run.

**Work:**
- Register real services via the UI (Registry → Add Service) — Anthropic, Ollama, or OpenAI-compatible
- Set `ANTHROPIC_API_KEY` in `server/.env`
- Run `POST /api/registry/services/:id/test-connection` to verify each service connects
- Disable or delete the 3 seeded demo services

**Files touched:** `server/.env`, UI only — no code changes needed here.

**Acceptance:** Every service in the registry returns a green connection test.

---

### Phase 2 — Real Evaluations (3–5 days)

**Goal:** Replace the JSON+PII scoring with meaningful LLM-as-judge evaluations.

This is the core technical work. Right now `evaluationService.js` sends a hardcoded prompt and checks the response for formatting. We need a real eval loop:

```
For each registered service:
  1. Send a test prompt (from a configurable eval dataset)
  2. Get the model's response
  3. Send response to a judge LLM (Claude) with a scoring rubric
  4. Store: score, reasoning, category, latency, token cost
```

**Work breakdown:**

| # | Task | File | Effort |
|---|------|------|--------|
| 2.1 | Add `eval_prompt` and `eval_rubric` fields to `services` table | `server/db.js` | 0.5d |
| 2.2 | Build `judgeEvaluation(response, rubric)` function in `anthropicService.js` — sends response to Claude with rubric, returns structured score | `server/services/anthropicService.js` | 1d |
| 2.3 | Rewrite `evaluationService.js` to: (a) call the target service with `eval_prompt`, (b) pass response to judge, (c) store multi-dimensional scores | `server/services/evaluationService.js` | 1d |
| 2.4 | Add eval prompt/rubric config to the Registry UI (per-service form) | `client/src/pages/RegistryPage.jsx` | 1d |
| 2.5 | Extend `evaluations` table schema: add `latency_ms`, `token_count`, `judge_reasoning` columns | `server/db.js` | 0.5d |

**Acceptance:** Monitoring page shows real scores with judge reasoning, not just 0/100 binary checks.

---

### Phase 3 — Real Dashboard (2–3 days)

**Goal:** Make every number on the dashboard reflect real data.

Right now DashboardPage and MonitoringPage show real DB data — but the DB is full of seeded fake metrics. Once Phase 2 is running, metrics will be real. We need the UI to display them usefully:

| # | Task | File | Effort |
|---|------|------|--------|
| 3.1 | Monitoring page: show `judge_reasoning` in eval history, highlight failing dimensions | `client/src/pages/MonitoringPage.jsx` | 0.5d |
| 3.2 | Service detail: add trend chart (score over time, last 10 evals) | `client/src/pages/ServiceDetailPage.jsx` | 1d |
| 3.3 | Dashboard: show cost tracker (total tokens spent, cost estimate) | `client/src/pages/DashboardPage.jsx` + `server/routes/monitoring.js` | 0.5d |
| 3.4 | Drift alert: when score drops >10 points in one cycle, auto-create incident (already exists, just needs threshold tuning) | `server/.env` → `DRIFT_THRESHOLD` | 0d |

**Acceptance:** Dashboard shows real trends from real evals, zero seeded data visible.

---

### Phase 4 — Production Hardening (1–2 days)

**Goal:** Make it safe to leave running unattended.

| # | Task | Effort |
|---|------|--------|
| 4.1 | Change `JWT_SECRET`, `ADMIN_PASSWORD` in `.env` | 0.1d |
| 4.2 | Set `DEMO_SEED_DATA=false` so restarts don't re-inject fake data | 0.1d |
| 4.3 | Wire up SMTP for invite emails (already coded, just needs creds) | 0.5d |
| 4.4 | Set `EVALUATION_CRON` to a sensible interval for your use case (hourly? 6h?) | 0.1d |
| 4.5 | Add a `Dockerfile` + `docker-compose.yml` for reproducible deploys | 1d |

---

## Priority Order

```
Phase 2 (real evals) > Phase 1 (real services) > Phase 3 (real dashboard) > Phase 4 (hardening)
```

Phase 2 is the hardest and most impactful — everything else depends on having real evaluation scores.

---

## Key Files to Know

| File | Role |
|------|------|
| `server/services/evaluationService.js` | The eval engine — rewrite this for Phase 2 |
| `server/services/anthropicService.js` | Multi-provider LLM adapter — add judge function here |
| `server/db.js` | Schema + seed data — add columns, disable demo seed |
| `client/src/pages/RegistryPage.jsx` | Add eval prompt/rubric fields per service |
| `client/src/pages/MonitoringPage.jsx` | Show judge reasoning in eval history |
| `server/.env` | API keys, cron schedule, drift threshold |
