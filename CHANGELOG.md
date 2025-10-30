# Changelog

All notable changes to this project are documented here.

This project adheres to Keep a Changelog and Semantic Versioning.

## [Unreleased]

Nothing currently.

## [1.2.0] - Unreleased

This section tracks changes intended for the upcoming 1.2.0 release.

### Added

- AI Assistant context plumbing across UI and server:
  - UI assistant now sends `orgId`, `projectId`, `teamId`, and `taskId`/`threadId` with requests.
  - Assistant badge shows `Org`, `P`, `Tm`, `Tk`, `Th` for quick verification.
  - Server controllers parse, log, and forward context; services surface it in signals/metrics.

### Changed

- `ProjectView` emits `orgId` via `onContext` (derived from `team.org.id`); `App.tsx` passes it to the assistant.
- `ui/lib/api.ts` includes full context in assistant endpoints (POST bodies or query params as appropriate).
- `controllers/aiController.ts` accepts context from body/query and forwards it to services.
- `services/aiAssistant.ts` functions accept optional context and return augmented payloads.

### Fixed

- No entries yet.

### Security

- No entries yet.

### Documentation

- Added developer notes on deriving `orgId` and validating context propagation with the badge and server logs.

## [1.0.0] - 2025-10-30

### Added

- Admin Controls: step-by-step layout with Quick Guide, helper text, and clear button labels.
- Admin safety: confirmation dialogs for destructive actions (ban & purge, change username).
- Admin data views: compact tables for Security Events and Rotation History.
- Signup providers: auto-route to Email Verification when account is unverified post-OAuth.
- Email signup: inline validation aligned with backend rules; friendly errors for invalid/banned email, existing user, required fields, and network issues.
- App layout: persistent top banner for unverified users with “Verify now” CTA; hides on verification view.
- Organizations & Teams: Organization, Team, Membership models; CRUD; invites; transfers; roles; management UI.
- RBAC: roles (Owner/Admin/Member/Viewer), permission matrix, middleware enforcement across routes, conditional UI.
- Projects & Tasks: subtasks, dependencies, labels, due dates, priority, assignee, watchers; endpoints and Kanban/UI.
- Real-Time Collaboration: Socket.IO server, task/comment live updates, presence, client subscriptions, throttling & limits.
- Comments & Threads: threaded comments, reactions, mentions `@username`; endpoints; UI with autocomplete and preview.
- Files & Attachments: versioning, previews, history, drag-and-drop uploads; retention hooks and access checks.
- Search: full-text endpoints, filters, indexed fields, global search UI, saved chips; pagination.
- Notifications Center: preferences, list/read/unread/delete, digest jobs; screens with badges and filters.
- Authentication & Sessions: device/session management, refresh rotation, session list UI, revoke flows.
- Email Verification & Account: hardened resend/verify; change email + re-verify; account management UI.
- Observability: global error handler, structured logs, request logging, `/metrics` endpoint; SLO scaffolding.
- Performance: pagination, ETag/If-None-Match, GET caching, hot-path indexes, virtualized lists, rate limiting.
- Testing & Quality: expanded unit/integration/E2E suites; OpenAPI spec & validation; CI lint/format/test gates; seed scripts.
- Developer Experience: shared types for contracts; migrations; feature flags; one-command scripts; contribution docs.
- UX & Accessibility: keyboard navigation, ARIA, contrast, focus outlines, skeletons, optimistic UI, i18n, preferences.
- Integrations: GitHub/Jira linking & sync; Slack notifications & slash commands; Calendar ICS import/export; Webhooks (HMAC).
- Data Lifecycle: exports, deletions (grace/soft-delete), retention policies across logs/notifications/tasks/attachments.
- AI Assist: authoring suggestions, triage hints, analytics insights.

### Changed

- Authentication UX: Login gated until user is verified; clearer flow and messages.
- Token handling: store refresh token; auto-refresh access token on 401; retry requests after refresh.
- Error handling: treat 403 `auth:needs_verification` with UI guidance; route guards improved.
- Admin Controls styling: consistent cards, separators, and dark-mode contrast for readability.
- Verification flow: preserve return view after success; avoid duplicate prompts.

### Fixed

- Backend: TypeORM `RefreshToken.expiresAt`/`createdAt` columns changed from `datetime` to `timestamp` for PostgreSQL compatibility (fixes DataTypeNotSupportedError).

### Security

- RBAC applied across routes; audit logs for admin actions and exports; hardened CORS; secrets rotation guidance; admin least-privilege patterns.

### Docs

- Rewrote and consolidated the CHANGELOG for the 1.0.0 release.

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
