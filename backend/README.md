# SCW backend — Phase 11

Optional FastAPI service for accounts, role-based workspace access, shared state snapshots, audit events and a server-side Gemini proxy. The existing static SCW frontend remains usable on its own. `src/cloud_sync.js` adds login/register, explicit import/export choice, version-aware autosync and the authenticated Gemini proxy. Configure the frontend with the deployed API base URL in the cloud modal.

## Local run

Python 3.11+:

```bash
cd backend
python -m venv .venv
# Activate the virtual environment, then:
pip install -r requirements.txt
cp .env.example .env
# Set DATABASE_URL and SCW_JWT_SECRET in your shell or hosting environment.
uvicorn main:app --reload --port 8000
```

Health: `GET /api/health`. Interactive API documentation: `/docs`.

For local quick tests, SQLite is used by default at `backend/scw.db`. Production should use PostgreSQL.

## Roles

- `owner`: workspace owner
- `admin`: manage membership
- `operator`: read and update shared state
- `viewer`: read-only

New users receive their own workspace. To add a collaborator, that person must first register; then an owner/admin can add their email and role.

## Core API

- `POST /api/auth/register` — create account + owner workspace
- `POST /api/auth/login` — issue bearer token
- `GET /api/auth/me` — current account
- `GET/POST /api/workspaces` — list/create workspaces
- `GET/POST /api/workspaces/{id}/members` — list/add members
- `GET/PUT /api/workspaces/{id}/state` — versioned shared JSON snapshot
- `GET /api/workspaces/{id}/audit` — recent workspace audit events
- `POST /api/workspaces/{id}/ai/analyze` — Gemini proxy; key stays on server

State writes support `expected_version` to reject stale updates with HTTP 409. Payloads are limited to 1 MB. AI context is limited to 20 KB.

## Hosting

Deploy this directory as a Docker service (or Python web service with root directory `backend` and start command `uvicorn main:app --host 0.0.0.0 --port $PORT`). Attach a managed PostgreSQL database and set the environment variables from `.env.example` in the host dashboard. Generate a long random `SCW_JWT_SECRET`; do not use the example value. Set `SCW_CORS_ORIGINS` to the exact frontend origin. Add your own Gemini key only to the server environment if/when you want AI requests enabled.

## Phase 11 boundary

This phase establishes the server-side multi-user foundation and API contract. Existing Phase 2–10 browser modules still write to localStorage; the frontend-to-backend synchronization adapter and migration of each module are Phase 12 integration work. Do not treat the current prototype as a production WMS until that integration, deployment hardening, backups, rate limits and operational monitoring are completed.
