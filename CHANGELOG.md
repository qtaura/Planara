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

### Changed
- Migrated PostCSS configuration to use `@tailwindcss/postcss` (Tailwind v4) with explicit ESM imports and `autoprefixer`.
- Updated global CSS to include Tailwind core layers and base typography tokens for consistent rendering.
- Backend server entry updated to initialize SQLite `DataSource` and mount new routers.
- TypeScript `tsconfig.server.json` now enables `experimentalDecorators` + `emitDecoratorMetadata`, and uses `module: NodeNext`.
- Dashboard, AppSidebar, and ProjectView now load backend data (with mock fallback if the API is offline).
- ProjectView fetches related `tasks` and `milestones` via API and includes a loading state.
- Vite config resolves `@lib`, `@components`, `@styles`, `@types`, `@data` aliases to match `ui/tsconfig.json` paths.

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