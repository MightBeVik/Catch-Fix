# Project Structure

This starter is split for parallel team development.

## Backend

- `app/main.py`: FastAPI entry point and CORS setup
- `app/api/router.py`: top-level API router
- `app/core/`: shared config and module manifest
- `app/modules/registry/`: Module 1 backend area
- `app/modules/monitoring/`: Module 2 backend area
- `app/modules/incidents/`: Module 3 backend area
- `app/modules/governance/`: Module 4 backend area

## Frontend

- `frontend/src/layout/`: shared shell only
- `frontend/src/modules/registry/`: Module 1 React area
- `frontend/src/modules/monitoring/`: Module 2 React area
- `frontend/src/modules/incidents/`: Module 3 React area
- `frontend/src/modules/governance/`: Module 4 React area
- `frontend/src/styles/theme.css`: copied visual theme from the original app
- `frontend/src/styles/react-overrides.css`: React/mobile/layout adjustments

## Rule Of Thumb

Module owners should stay inside their module folders as much as possible.
Only the integration lead should regularly change shared shell files.