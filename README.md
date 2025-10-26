<p align="center">
  <a href="https://github.com/qtaura/Planara" aria-label="Planara">
    <img src="ui/assets/planara-logo.svg" width="140" alt="Planara logo" />
  </a>
</p>

<p align="center">
  Collaborative planning and execution platform for product and engineering teams.
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#what-is-planara">What Is Planara</a> •
  <a href="#key-capabilities">Key Capabilities</a> •
  <a href="#use-cases">Use Cases</a> •
  <a href="#verification-flow">Verification Flow</a> •
  <a href="#quickstart">Quickstart</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#dev-mode">Dev Mode</a> •
  <a href="#api">API</a> •
  <a href="#testing">Testing</a> •
  <a href="#monitoring">Monitoring</a> •
  <a href="#troubleshooting">Troubleshooting</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Overview

Planara is a full-stack TypeScript application with a React + Vite frontend and an Express + TypeORM backend. It delivers a secure, enumeration-safe email verification journey and a modern, accessible UI.

- End-to-end TypeScript with strict configs.
- Modern UI with Tailwind v4, dark/light theme, and accessible flows.
- Robust email verification: case-insensitive, rate-limited, and lockout-protected.
- Optional monitoring hooks (Sentry) without hard dependencies.

## What Is Planara

Planara is a verification-first, collaborative workspace that helps teams plan, execute, and track work with clarity. It brings projects, tasks, milestones, roadmaps, files, and team communication into a cohesive experience designed for everyday momentum and high-level visibility.

- Single place to organize projects, tasks, and timelines.
- Clear progress tracking with milestones and dashboards.
- Collaboration via comments and notifications.
- Reliable onboarding using secure email verification (plus OAuth options).

## Key Capabilities

- Project and Task Management: create, assign, and track progress.
- Kanban Boards: drag-and-drop task management in a modern interface.
- Calendar & Roadmap Views: visualize schedules and longer-term plans.
- Comments & Notifications: keep conversations and alerts in context.
- Dashboard: quick overview of what matters across projects.
- Files View: organize relevant assets for project delivery.
- GitHub Repo Picker: connect repos to projects (for code-centric teams).
- AI Assistant: contextual guidance integrated into the workspace.
- Theming: dark/light modes with persistent preferences.

## Use Cases

- Product Planning: roadmap alignment across squads and milestones.
- Execution Tracking: operational heartbeat for sprints and releases.
- Milestone Reviews: ensure critical deliverables stay on track.
- Onboarding: verify emails securely and start collaborating fast.
- Team Visibility: shared source of truth for project status.

## Verification Flow

Email verification is designed to be secure, predictable, and user-friendly.

- Case-insensitive emails: all emails are trimmed and lowercased on receipt.
- Enumeration-safe responses:
  - Send Code returns a generic success even if the email does not exist or is already verified.
  - Verify Code always returns a generic invalid response for nonexistent users or already-verified accounts.
- Rate limiting and backoff:
  - Resend cooldown (1 minute) with escalating backoff on rapid requests.
  - Verify attempts use progressive backoff and temporary lockouts after repeated failures.
- Replay protection: codes are marked used after verification and old codes are purged.
- Status endpoint: provides verification state for known users.

Endpoints (under `GET/POST /api/users/...`):

- `POST /auth/send-code` – Request a verification code.
- `POST /auth/verify-code` – Submit the 6-digit code to verify.
- `GET /auth/verification-status/:email` – Check a user’s verification status.

## Quickstart

### Prerequisites

- `Node.js 20+` (18 works, 20 recommended)
- `npm 9+`

### Install

```bash
# Clone
git clone https://github.com/qtaura/Planara.git
cd Planara

# Backend deps
npm install

# UI deps
cd ui
npm install
```

### Run Backend

```bash
cd ..
# Build TypeScript (ensures decorator metadata for TypeORM)
npm run build
# Start API server (example PORT=3010)
PORT=3010 npm start
# API available at http://localhost:3010/api
```

### Run Frontend

```bash
cd ui
# Point UI at your API
VITE_API_URL=http://localhost:3010/api npm run dev
# Dev server at http://localhost:5173 (or next free port)
```

## Configuration

### Backend

- `PORT` – API port (default: `3001`).
- `JWT_SECRET` – Secret for signing tokens.
- `RESEND_API_KEY` – Email provider key (if absent, dev mode exposes `devCode`).
- `CODE_SIGN_SECRET` – Optional HMAC secret for codes (default: dev secret).
- Optional monitoring:
  - `SENTRY_DSN` – Enable backend monitoring (if set).
  - `SENTRY_TRACES_SAMPLE_RATE` – Optional traces sampling rate (e.g., `0.1`).

### Frontend (ui/)

- `VITE_API_URL` – Base API URL (e.g., `http://localhost:3010/api`).
- Optional monitoring:
  - `VITE_SENTRY_DSN` – Enable frontend monitoring (if set).
  - `VITE_SENTRY_TRACES_SAMPLE_RATE` – Optional traces sampling rate.

## Dev Mode

Purpose: make local development easy without external providers.

- If `RESEND_API_KEY` is not set, `POST /auth/send-code` responds with `devCode` containing the 6-digit code so you can verify immediately.
- Emails are always normalized (trim + lowercase) across all endpoints.
- Responses are enumeration-safe: nonexistence and already-verified states do not leak.
- UI detects offline mode and surfaces helpful messaging for retry.

## API

Detailed request/response examples for verification are available at:

- `docs/api/email-verification.md`

Summary:

- `POST /api/users/auth/send-code`
- `POST /api/users/auth/verify-code`
- `GET /api/users/auth/verification-status/:email`

Admin endpoints:

- `POST /api/users/auth/admin/unlock` – Clear lockouts/backoffs for a user (auth required).
- `GET /api/users/auth/admin/lockout-state/:email` – Inspect lockout/backoff state (auth required).
- `GET /api/users/auth/admin/events/:email` – Recent security events (auth required).
- `GET /api/users/auth/admin/rotations/:email` – Verification secret rotations (auth required).

## Testing

- Backend tests (integration): `npm run test:run`
- UI tests (vitest):
  - From `ui/`: `npm run test`
  - Email normalization and offline behavior covered in `ui/components/__tests__/`.

## Monitoring

Sentry instrumentation is optional and uses runtime-only imports:

- Backend: set `SENTRY_DSN` to enable; no package required unless configured.
- Frontend: set `VITE_SENTRY_DSN` to enable.

Errors are captured via global handlers in both backend and UI.

## Troubleshooting

- Port conflicts: change `PORT` for backend or `VITE_API_URL` for UI.
- Decorators: build the backend before starting (`npm run build`).
- Offline UI: UI shows offline toasts and retries once network reconnects.
- Windows build EPERM: ensure dev servers are stopped before running UI build or run terminal as Administrator.

## Project Structure

```
Planara/
├── README.md
├── package.json
├── controllers/
├── models/
├── routes/
├── db/
├── tests/
├── ui/
│   ├── components/
│   ├── lib/
│   ├── styles/
│   ├── types/
│   ├── vite.config.ts
│   └── package.json
└── docs/
    ├── api/
    ├── ux/
    └── load-testing.md
```

## Developer Experience

- Shared API types: generate OpenAPI types to `types/openapi-types.ts` and import from `planara-api/types/openapi-types` in consumers.
- Feature flags: configure `FEATURE_REALTIME` and `FEATURE_SEARCH` to stage/kill features at runtime.
- Migrations: use `npm run migrate` and `npm run migrate:revert`; scaffold new files with `npm run migrate:new <name>`.
- One-command setup: `npm run dev:all` runs API and UI together.
- Seed data: `npm run seed` seeds a local dev database.

## Contributing

- Use focused PRs and conventional commits (e.g., `feat:`, `fix:`, `docs:`).
- Keep changes minimal and aligned with existing style.
- Document API changes by updating `openapi/openapi.yaml` and re-run `npm run gen:openapi`.
- Prefer typed contracts over stringly endpoints; import shared types from `planara-api/types/*`.
