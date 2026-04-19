# Catch-Fix AI Operations Control Room

Catch-Fix is an AI Operations Control Room built for ARTI-409-A AI Systems & Governance. The new course-deliverable implementation lives in the root-level `client` and `server` folders and uses React, Tailwind CSS, Node.js, Express, SQLite, Anthropic Claude via REST, and node-cron.

## Project Structure

- `client/`: React + Vite + Tailwind frontend
- `server/`: Express API, SQLite initialization, RBAC middleware, scheduled evaluation job, Anthropic integration, and tests
- `app/` and `frontend/`: earlier FastAPI and legacy frontend reference code retained for comparison during the rebuild

## Environment Variables

Create `server/.env` using `server/.env.example`.

Required for live Claude-backed features:

- `ANTHROPIC_API_KEY`: Anthropic API key for Claude REST calls

Optional:

- `PORT`: Express server port, default `3001`
- `DATABASE_PATH`: SQLite database file path, default `./data/catch_fix.db`
- `DEMO_SEED_DATA`: seeds realistic demo records on startup when the database is empty or partially uninitialized, default `true`
- `ANTHROPIC_MODEL`: Claude model name, default `claude-sonnet-4-20250514`
- `ANTHROPIC_ENDPOINT`: Anthropic REST endpoint, default `https://api.anthropic.com/v1/messages`
- `ANTHROPIC_TIMEOUT_MS`: per-request timeout for Claude calls, default `15000`
- `ANTHROPIC_MAX_RETRIES`: retry count for transient Claude failures, default `2`
- `EVALUATION_CRON`: node-cron expression for scheduled evaluations, default `*/30 * * * *`
- `DRIFT_THRESHOLD`: drift threshold score, default `70`

## Setup

1. Clone the repository.
2. From the repository root, run `npm install`.
3. Create `server/.env`. If you do not set `ANTHROPIC_API_KEY`, the app still runs with seeded demo data but Claude-backed actions stay disabled in the UI.
4. Start the full application from the repository root with `npm run dev`.

The development servers run at:

- Client: `http://127.0.0.1:5174`
- Server: `http://127.0.0.1:3001`

## Demo Data

On startup, the server seeds a small control-room dataset unless `DEMO_SEED_DATA=false`.

- 3 services across dev and prod
- recent metrics and evaluation history
- approved and pending incidents
- approved maintenance plans
- audit log activity for governance export and review screens

This makes the application immediately explorable before any manual data entry or Anthropic key setup.

## Governance Console

The governance screen now doubles as a lightweight control plane for demo and review workflows.

- inspect runtime readiness, scheduler state, and record counts
- run an evaluation cycle on demand
- pause or resume the scheduler
- reseed demo data without wiping everything
- fully reset and reseed the local operational dataset
- clear operational data when you want an empty-state walkthrough

Admin-only controls are enforced through the simulated role model.

## Testing

Run all server unit and integration tests from the repository root:

```bash
npm test
```

Current automated coverage includes:

- Registry CRUD and RBAC enforcement
- Evaluation scoring logic
- Drift detection logic
- Compliance export formatting
- End-to-end evaluation pipeline
- Incident creation and human-approved LLM summary flow
- Governance control-plane runtime status and admin actions

## Human In The Loop

Claude output is only used to:

- draft incident summaries
- suggest likely root causes
- draft rollback plans

No LLM-generated content is auto-approved, auto-saved, or auto-executed. The UI requires explicit user review and approval before persistence.