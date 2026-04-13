# Module Ownership Plan

## Teammate 1

- Owns Module 1: Registry & Connection
- Backend: `app/modules/registry`
- Frontend: `frontend/src/modules/registry`
- Suggested branch: `feature/module-1-registry`

## Teammate 2

- Owns Module 2: Monitoring & Evaluation
- Backend: `app/modules/monitoring`
- Frontend: `frontend/src/modules/monitoring`
- Suggested branch: `feature/module-2-monitoring`

## Teammate 3

- Owns Module 3: Incidents & Maintenance
- Backend: `app/modules/incidents`
- Frontend: `frontend/src/modules/incidents`
- Suggested branch: `feature/module-3-incidents`

## Teammate 4

- Owns Module 4: Governance & Compliance
- Backend: `app/modules/governance`
- Frontend: `frontend/src/modules/governance`
- Suggested branch: `feature/module-4-governance`
- Also acts as integration lead for shared wiring and merge reviews

## Shared Files

Avoid editing these unless necessary and coordinated:

- `app/main.py`
- `app/api/router.py`
- `frontend/src/layout/AppShell.jsx`
- `frontend/src/styles/theme.css`
- `frontend/src/styles/react-overrides.css`