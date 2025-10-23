# Changelog

All notable changes to this project are documented here.
This project follows the "Keep a Changelog" format and Semantic Versioning.

## 0.4.0 - 2025-10-23

### Added
- Unified signup + OAuth verification flow with consistent redirects.
- Email verification screen with send/resend, code entry, and toasts.
- Client `user.isVerified` persistence and global `auth:verified` event.
- Automatic routing to verification after email signup.
- OAuth verification events include `email`, `provider`, `needsUsername`.
- Skip verification UI for already verified users.
- Verification status polling via `getVerificationStatus`.
- Segmented 6-cell OTP input with auto-advance and paste handling.
- Resend cooldown with timer (60s), disables resend until cooldown ends.
- Expiry countdown using `expiresAt`, allow re-send immediately after expiry.
- Error states surfaced clearly: invalid, expired, too many attempts (client-side), network.
- Accessibility improvements: focus management, ARIA announcements, inline errors.

### Changed
- App routing guards use `currentUser.isVerified` to bypass verification.
- OAuth/Dashboard message handling emits structured verification details.
- SignupProviders and Dashboard aligned on event names and payloads.

### Fixed
- Edge case where verified users were shown verification UI again.
- OAuth flows inconsistently routing post-verification across providers.

### Docs
- Updated this changelog to reflect the new auth and verification flow.

## 0.3.0 - 2025-10-20

### Added
- OAuth sign-in from Login screen with popup for GitHub, Google, Slack.
- Case-insensitive usernames via `usernameLower` shadow column and uniqueness checks.
- One-time username change limit enforced via `usernameChangeCount`.
- Caps Lock detection on password field with inline hint on Sign-In.
- Dark/Light mode toggle surfaced on Sign-In (persisted in `localStorage`).
- Normalized, user-friendly login error messages (invalid credentials, wrong password, network).
- Immediate UI propagation after avatar save using global event dispatch.

### Changed
- Backend compiles with `tsc -p tsconfig.server.json` before start to ensure decorator metadata.
- API server confirmed stable on `http://localhost:3010/` when default ports are busy.
- `ThemeProvider` wraps the UI application to enable global theme toggling.
- OAuth controller responses normalized to avoid leaking provider-specific errors.
- `ui/lib/api.ts` and `LoginScreen.tsx` updated to improve auth UX (messages, popup handling).

### Fixed
- Addressed `EADDRINUSE` errors by selecting available server/UI ports and documenting overrides.

### Docs
- README completely revamped to professional standard with inline logo, badges, architecture, setup, configuration, API overview, troubleshooting.
- Documented OAuth callback URIs for `PORT=3010` and `VITE_API_URL` usage in development.
- Added Security & Auth notes on case-insensitive usernames, change limit, JWT, and OAuth.

### Chore
- Ensured local SQLite files are ignored by Git and reinforced env-driven configuration.

---

## 0.0.0 - 2025-10-20

### Added
- Vite + React application under `ui/` with complete component library (Radix UI, Lucide, Recharts, Sonner, Embla, Vaul, Motion, etc.).
- Global styles `ui/styles/globals.css` importing Tailwind v4 core layers and defining theme tokens.
- README with setup instructions that mirror localhost behavior.
- Node.js Express + TypeScript backend scaffold with `index.ts` and `GET /health`.
- SQLite + TypeORM backend with entities for `User`, `Project`, `Task`, `Milestone`, `Comment`.
- Controllers for CRUD operations and JWT-based auth, plus authentication middleware.
- CRUD API routes under `/api/projects`, `/api/tasks`, `/api/users`, `/api/milestones`, `/api/comments` in `routes/*`.
- UI API client `ui/lib/api.ts` to fetch and transform `Project`, `Task`, and `Milestone` data from `/api/*` into UI types.
- Vite path aliases in `ui/vite.config.ts` mapping `@lib`, `@components`, `@styles`, `@types`, `@data` to local folders.
- UI API helpers: `createProject`, `updateTaskStatus`, `deleteTask` for project/task CRUD.
- Task actions in `TaskModal` (mark done, delete) with toasts and event dispatch.
- Event-driven UI updates via `projects:changed` and `tasks:changed` for instant refresh.

### Changed
- Migrated PostCSS configuration to use `@tailwindcss/postcss` (Tailwind v4) with explicit ESM imports and `autoprefixer`.
- Updated global CSS to include Tailwind core layers and base typography tokens for consistent rendering.
- Backend server entry updated to initialize SQLite `DataSource` and mount new routers.
- TypeScript `tsconfig.server.json` now enables `experimentalDecorators` + `emitDecoratorMetadata`, and uses `module: NodeNext`.
- Dashboard, AppSidebar, and ProjectView now load backend data (with mock fallback if the API is offline).
- ProjectView fetches related `tasks` and `milestones` via API and includes a loading state.
- Vite config resolves `@lib`, `@components`, `@styles`, `@types`, `@data` aliases to match `ui/tsconfig.json` paths.
- CreateProjectModal integrated with backend; shows loading/error, toasts, and dispatches `projects:changed`.
- Dashboard and AppSidebar refresh automatically on `projects:changed` with loading/error feedback.
- ProjectView refreshes relations on `tasks:changed` and `projects:changed` with robust loading/error handling.

### Fixed
- Resolved Tailwind/PostCSS overlay error caused by using `tailwindcss` directly as a PostCSS plugin.
- Addressed ESM circular metadata error by adjusting relation property types and building with `tsc`.
- Confirmed API server stability at `http://localhost:3001/` with successful endpoint verification.
- Fixed Vite import analysis error by configuring `resolve.alias` for `@lib/api` and related paths.

### Chore
- Initialized Git repository, set default branch to `main`, and added remote `origin` (`https://github.com/qtaura/Planara`).
- Added `.gitignore` for Node/Vite artifacts and common development outputs.
- Committed and pushed the UI app and documentation to GitHub.
- Installed backend dependencies and added `dev`, `build`, `start` scripts in `package.json`.
- Committed and pushed backend TypeORM migration (entities, controllers, routes, middleware, server).

### Notes
- Backend dev server runs with compiled output: `npm run build && npm start` for reliable decorator metadata.
- Base endpoints: `GET /health`, CRUD under `/api/projects`, `/api/tasks`, `/api/users`, plus `/api/milestones`, `/api/comments`.
- Storage uses local SQLite file `db/planara.sqlite` managed by TypeORM `DataSource`.
- UI dev server under `ui/` runs with `npm run dev` and may choose `5173` or the next available port (e.g., `5174`).
- Transient `net::ERR_ABORTED` logs during HMR re-optimization are benign; refresh if seen.
- UI components gracefully fall back to `ui/data/mockData.ts` if the API is unavailable.

## 0.2.0 (Unreleased)

### Security
- Ignore local SQLite database files in Git (`/db/planara.sqlite`, `/db/*.sqlite`, `*.sqlite`).
- Untracked `db/planara.sqlite` to prevent leaking user emails/usernames.

### Added
- UI `.env` with `VITE_API_URL` to point frontend to backend.
- Client `listUsers` and server relations included in `listProjects` for richer data.
- Global UI events: `user:updated`, `settings_active_section`, `dashboard_filter` for coordinated navigation and refresh.

### Changed
- Sidebar shows current user name and avatar; clicking opens Settings → Profile.
- Sidebar “Notifications” and “Team” navigate to Settings with section preselected.
- Sidebar “Archived” sets a dashboard filter used by Dashboard.
- Dashboard stat cards compute real metrics from tasks/milestones (completed tasks, milestones, avg velocity).
- `ui/lib/api.ts` normalizes task statuses and computes project progress from tasks.

### Fixed
- Profile avatar save now updates immediately across the app via global event broadcast.

### Docs
- Note to never commit local SQLite DB; use `.gitignore` patterns above.
- `avatar` column to `User` entity for storing image URLs/data.
- Avatar update support via `PUT /api/users/:id` and client `updateUser`.
- UI: Avatar upload with preview in `SettingsScreen` (file input, size checks).
- Milestone progress auto-calculation: backend updates `Milestone.progressPercent` based on tasks with status `done`; recalculated on task create/update/delete.

### Changed
- Backend `updateProfile` now checks duplicates and returns `409` on existing `username`/`email`.
- UI API client surfaces server error messages (e.g., conflicts) for clearer toasts.
- UI `updateUser` payload includes `avatar` to persist avatar changes.

### Fixed
- Username change failures due to API mismatch and silent error handling.
- Non-functional “Change Avatar” button (now opens file picker and previews).
- OAuth redirects showing provider errors due to missing callback URIs; documented fixes.

### Docs
- Documented OAuth redirect URIs:
  - Slack: `http://localhost:3002/api/users/oauth/slack/callback`
  - Google: `http://localhost:3002/api/users/oauth/google/callback`
  - GitHub: `http://localhost:3002/api/users/oauth/github/callback`
- Noted env vars required for OAuth (`SLACK_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, optional GitHub).
- Clarified UI backend base via `VITE_API_URL` during development.

## 2025-10-22 — Routing and SPA fallback
- Added React Router integration in `ui/main.tsx` using `BrowserRouter`, `Routes`, and `Route` for pages: `/`, `/login`, `/signup`, `/signup/providers`, `/signup/email`, `/signup/username`, `/dashboard`, `/project/:id`, `/settings`, `/onboarding`.
- Implemented onboarding route handler to navigate to `/dashboard` on completion.
- Confirmed backend SPA fallback in `index.ts`: serves `ui/dist/index.html` for non-API routes (`app.get('*', ...)`) while leaving `/api/*` to Express routers.
- Vite config remains standard; no special base is required for same-origin deploys. For multi-domain setups, set `VITE_API_URL` in UI.
- Deployment rewrite rules:
  - Railway: default static serving works with backend fallback; ensure build outputs to `ui/dist`.
  - Cloudflare/Netlify: add rewrite `/* -> /index.html (200)` to enable direct deep-linking to SPA routes.
- Notes: Remove any redundant `prebuild` scripts that run `npm ci` again on Railway to avoid `EBUSY` errors. Install UI dev deps (`vite`, `@vitejs/plugin-react`, `react-router-dom`) locally for development.