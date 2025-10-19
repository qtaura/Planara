# Changelog

All notable changes to this project are documented here.
This project follows the "Keep a Changelog" format and Semantic Versioning.

## 0.0.0 (Unreleased)

### Added
- Vite + React application under `ui/` with complete component library (Radix UI, Lucide, Recharts, Sonner, Embla, Vaul, Motion, etc.).
- Global styles `ui/styles/globals.css` importing Tailwind v4 core layers and defining theme tokens.
- README with setup instructions that mirror localhost behavior.
- Node.js Express + TypeScript backend scaffold with `index.ts` and `GET /health`.
- JSON file storage via `db/json.ts` and `db/data.json` for `User`, `Task`, `Project`.
- CRUD API routes under `/api/projects`, `/api/tasks`, `/api/users` in `routes/*`.

### Changed
- Migrated PostCSS configuration to use `@tailwindcss/postcss` (Tailwind v4) with explicit ESM imports and `autoprefixer`.
- Updated global CSS to include Tailwind core layers and base typography tokens for consistent rendering.

### Fixed
- Resolved Tailwind/PostCSS overlay error caused by using `tailwindcss` directly as a PostCSS plugin.
- Installed and configured `@radix-ui/react-progress` to fix Vite pre-transform resolution errors.
- Confirmed dev server stability at `http://localhost:5173/` after dependency re-optimization.

### Chore
- Initialized Git repository, set default branch to `main`, and added remote `origin` (`https://github.com/qtaura/Planara`).
- Added `.gitignore` for Node/Vite artifacts and common development outputs.
- Committed and pushed the UI app and documentation to GitHub.
- Installed backend dependencies and added `dev`, `build`, `start` scripts in `package.json`.
- Committed and pushed backend setup (server, routes, models, db) to remote.

### Notes
- Vite HMR may show `net::ERR_ABORTED` entries during reload; this is expected and not a failure.
- No environment variables are required at this time.
- Backend dev server runs at `http://localhost:3001/` during development (`npm run dev`).
- Base endpoints: `GET /health`, CRUD under `/api/projects`, `/api/tasks`, `/api/users`.
- Storage uses local JSON file `db/data.json`; SQLite may be integrated later.