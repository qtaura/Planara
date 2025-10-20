# Changelog

All notable changes to this project are documented here.
This project follows the "Keep a Changelog" format and Semantic Versioning.

## 0.0.0 (Unreleased)

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

## 0.1.0 - 2025-10-20

### Added
- `avatar` column to `User` entity for storing image URLs/data.
- Avatar update support via `PUT /api/users/:id` and client `updateUser`.
- UI: Avatar upload with preview in `SettingsScreen` (file input, size checks).

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