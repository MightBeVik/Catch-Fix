# Team Start Here

This project is split into 4 modules so 4 people can work in parallel.

## Stack

- Backend: FastAPI
- Frontend: React + Vite
- Theme: preserved from the original Axiom Sentinel UI

## Branches

- `main`: stable branch
- `develop`: working integration branch
- `feature/module-1-registry`
- `feature/module-2-monitoring`
- `feature/module-3-incidents`
- `feature/module-4-governance`

## Module Ownership

### Module 1: Registry & Connection
- Backend: `app/modules/registry`
- Frontend: `frontend/src/modules/registry`

### Module 2: Monitoring & Evaluation
- Backend: `app/modules/monitoring`
- Frontend: `frontend/src/modules/monitoring`

### Module 3: Incidents & Maintenance
- Backend: `app/modules/incidents`
- Frontend: `frontend/src/modules/incidents`

### Module 4: Governance & Compliance
- Backend: `app/modules/governance`
- Frontend: `frontend/src/modules/governance`

## Shared Files

Only touch these if needed and tell the team first:

- `app/main.py`
- `app/api/router.py`
- `frontend/src/layout/AppShell.jsx`
- `frontend/src/styles/theme.css`
- `frontend/src/styles/react-overrides.css`

## Local Run

### Backend
`uvicorn app.main:app --reload`

### Frontend
`cd frontend`
`npm install`
`npx vite --host 127.0.0.1 --port 5173`

## How To Work

1. Switch to `develop`
2. Create or use your module branch
3. Work only inside your module folders
4. Open a pull request into `develop`

## Goal

Do not build 4 separate apps.
Build 4 parts of one app.