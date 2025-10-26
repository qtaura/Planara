# Changelog

All notable changes to this project are documented here.

This project adheres to Keep a Changelog and Semantic Versioning.

## [Unreleased]

### Added

- Admin Controls: step-by-step layout with Quick Guide, helper text, and clear button labels.
- Admin safety: confirmation dialogs for destructive actions (ban & purge, change username).
- Admin data views: compact tables for Security Events and Rotation History.
- Signup providers: auto-route to Email Verification when account is unverified post-OAuth.
- Email signup: inline validation aligned with backend rules; friendly errors for invalid/banned email, existing user, required fields, and network issues.
- App layout: persistent top banner for unverified users with “Verify now” CTA; hides on verification view.

### Changed

- Authentication UX: Login gated until user is verified; clearer flow and messages.
- Token handling: store refresh token; auto-refresh access token on 401; retry requests after refresh.
- Error handling: treat 403 `auth:needs_verification` with UI guidance; route guards improved.
- Admin Controls styling: consistent cards, separators, and dark-mode contrast for readability.
- Verification flow: preserve return view after success; avoid duplicate prompts.

### Fixed

- Backend: TypeORM `RefreshToken.expiresAt`/`createdAt` columns changed from `datetime` to `timestamp` for PostgreSQL compatibility (fixes DataTypeNotSupportedError).

### Docs

- Rewrote the entire CHANGELOG to list all features across releases.

## [0.1.0] - 2025-10-19

### Added

- Settings: avatar upload with preview and error surfacing in UI.
- Backend: avatar support and duplicate-handling logic.
- OAuth: documented provider URIs used by the app.
- Landing UX: start at landing page with header Sign in/Sign up.
- Signup: `SignupScreen` UI and signup API endpoint.

### Changed

- Navigation: redirect to login only when accessing protected routes.
- Dev experience: alignment of dev ports for UI and server.

## [0.0.0] - 2025-10-19

### Added

- Full Express + TypeScript backend scaffold.
- Storage: initial JSON storage, then migration to SQLite + TypeORM.
- Auth: JWT authentication, middleware, login and token issuance.
- Entities: `User`, `Project`, `Task`, `Milestone`, `Comment`, `Notification`, `SecurityEvent`, `EmailVerificationCode`, `RefreshToken`, `BannedEmail`.
- Controllers & routes: CRUD for projects, tasks, milestones, comments, notifications, users.
- UI foundation: Vite + React app with Tailwind v4, Radix components, theme context, and global styles.
- Screens & views: Dashboard, ProjectView, KanbanView, CalendarView, RoadmapView, FilesView, Notifications, Settings.
- Auth UI: Login screen, gated app layout, attach Authorization headers via `apiFetch`.
- Email verification: code generation, submission endpoints, and verification UI.
- Rate limiting middleware for key endpoints.

### Docs

- README with setup instructions, local UI run notes.
- Initial CHANGELOG capturing Tailwind v4 migration, UI app, and early fixes.

---

Release tags are informational until formal versioning is established. For detailed commit history, see `git log`.
