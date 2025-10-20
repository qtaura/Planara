<p align="center">
  <a href="https://github.com/qtaura/Planara" aria-label="Planara">
    <!-- Inline SVG logo to keep README self-contained -->
    <svg width="140" height="40" viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Planara logo">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8b5cf6"/>
          <stop offset="100%" stop-color="#6366f1"/>
        </linearGradient>
      </defs>
      <rect rx="28" ry="28" x="0" y="0" width="200" height="200" fill="url(#g)"/>
      <circle cx="70" cy="75" r="30" fill="white" opacity="0.3"/>
      <path d="M55 130 L115 130 L85 90 Z" fill="#fff" opacity="0.9"/>
      <text x="230" y="120" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="72" font-weight="700" fill="#111827">Planara</text>
    </svg>
  </a>
</p>

<p align="center">
  Strategic planning platform with modern UX, TypeScript end-to-end, and OAuth-enabled authentication.
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#api-overview">API Overview</a> •
  <a href="#development">Development</a> •
  <a href="#troubleshooting">Troubleshooting</a> •
  <a href="#changelog">Changelog</a>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white"/>
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white"/>
  <img alt="Node" src="https://img.shields.io/badge/Node-20+-339933?logo=node.js&logoColor=white"/>
  <img alt="Build" src="https://img.shields.io/badge/Build-tsc%20%F0%9F%94%A7-blue"/>
</p>

---

## Overview
Planara is a full-stack TypeScript application that pairs a Vite + React UI with a Node.js + Express backend using TypeORM and SQLite for storage. It’s designed to feel production-grade while staying easy to run locally.

- End-to-end TypeScript with strict configs and decorator metadata.
- OAuth login (GitHub, Google, Slack) and classic username/password.
- Case-insensitive usernames with conflict checks and a one-time change limit.
- Modern UI: Tailwind v4, Radix UI, dark/light theme toggle, helpful login errors, Caps Lock detection.
- Real-time-ish UI refresh via event dispatch for projects, tasks, and milestones.

## Features
- Authentication: JWT-based sessions, OAuth via GitHub/Google/Slack.
- Projects/Tasks/Milestones: CRUD with progress calculations and toasts.
- Profile: Avatar upload, immediate UI propagation after save.
- Theming: Dark/light persisted via `localStorage`, toggle from Sign-In.
- Robust UX: Clear error messages for login, inline Caps Lock hint.

## Tech Stack
- Frontend: React 18, Vite 5, Tailwind v4 (via `@tailwindcss/postcss`), Radix UI.
- Backend: Node 20+, Express, TypeORM, SQLite.
- Language: TypeScript across client and server.

## Getting Started
### Prerequisites
- Node.js 20+ (18 works, 20 recommended)
- npm 9+

### Clone & Install
```bash
# Clone
git clone https://github.com/qtaura/Planara.git
cd Planara

# Install backend deps
npm install

# Install UI deps
cd ui
npm install
```

### Run Backend
```bash
cd ..
# Compile TypeScript (ensures decorator metadata is emitted)
npm run build
# Start API server on an open port (example 3010)
PORT=3010 npm start
# API will be available at http://localhost:3010/api
```

### Run Frontend
```bash
cd ui
# Point the UI at the API port you chose
VITE_API_URL=http://localhost:3010/api npm run dev
# Vite will start at http://localhost:5173 or the next free port
```

## Architecture
- `ui/`: Vite React UI, Tailwind v4 styling, Radix components, domain data via `lib/api.ts`.
- `controllers/`, `routes/`, `entities/`: Backend organization for business logic, HTTP routing, and DB models.
- `tsconfig.server.json`: Enables `experimentalDecorators` and `emitDecoratorMetadata` for TypeORM.
- Storage: SQLite via TypeORM `DataSource`, local file under `db/`.

## Configuration
### Frontend (UI)
- `VITE_API_URL`: Base URL for API calls (e.g., `http://localhost:3010/api`).

### Backend (Server)
- `PORT`: API port, defaults to 3001 but can be set (e.g., 3010).
- `JWT_SECRET`: Secret used to sign tokens.
- OAuth providers:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`
  - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (optional)

Ensure OAuth callback URLs match your configured `PORT`, e.g.:
- `http://localhost:3010/api/users/oauth/google/callback`
- `http://localhost:3010/api/users/oauth/slack/callback`
- `http://localhost:3010/api/users/oauth/github/callback`

## API Overview
Base: `http://localhost:<PORT>/api`

- `GET /health` — Service readiness
- `POST /users/signup` — Create account
- `POST /users/login` — Login with username/email + password
- `GET /users` — List users
- `POST /users/oauth/:provider/start` — Begin OAuth (popup)
- `GET /users/oauth/:provider/callback` — OAuth callback → JWT
- `PUT /users/:id` — Update profile (avatar, username; enforces uniqueness + change limit)
- `CRUD /projects`, `CRUD /tasks`, `CRUD /milestones`, `CRUD /comments`

## Development
- Server scripts:
  - `npm run dev` — tsx watch (for development; decorators require correct config)
  - `npm run build` — `tsc -p tsconfig.server.json`
  - `npm start` — Run compiled server (`dist/index.js`)
- UI scripts (inside `ui/`):
  - `npm run dev` — Start Vite dev server
  - `npm run build` — Type-check + build
  - `npm run preview` — Serve built assets

## Security & Auth Notes
- Usernames are stored with a lowercase shadow column to enforce case-insensitive uniqueness.
- Users can change their username once; further attempts are rejected with clear messaging.
- JWT is issued for classic login and OAuth callbacks; tokens are handled by `ui/lib/api.ts`.
- OAuth error messages are normalized to avoid leaking provider details.

## UX Enhancements
- Sign-In screen includes a dark/light mode toggle.
- Caps Lock detection on password field with inline hint.
- Normalized login errors: incorrect password, invalid credentials, and network issues.
- Profile avatar saves broadcast UI updates to keep the app in sync.

## Troubleshooting
- `EADDRINUSE`: If the server port is busy, set `PORT` to an unused port (e.g., 3010).
- Decorators: Always build with `npm run build` before `npm start` to ensure metadata is emitted.
- Vite port: The UI chooses a free port automatically (5173+). Update `VITE_API_URL` if needed.
- SQLite: Local DB files under `db/` should be ignored by Git; do not commit them.

## Project Structure (monorepo)
```
Planara/
├── README.md
├── CHANGELOG.md
├── package.json
├── tsconfig.server.json
├── db/
├── entities/
├── controllers/
├── routes/
├── ui/
│   ├── index.html
│   ├── main.tsx
│   ├── App (1).tsx
│   ├── components/
│   ├── styles/globals.css
│   ├── lib/
│   ├── types/
│   ├── data/
│   ├── postcss.config.js
│   ├── vite.config.ts
│   └── package.json
```

## Contributing
- Use Conventional Commits (e.g., `feat:`, `fix:`, `docs:`).
- Keep code changes focused and aligned with existing style.
- Open a PR with a clear description and testing notes.

## Changelog
See [`CHANGELOG.md`](./CHANGELOG.md) for detailed release notes.