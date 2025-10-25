import 'dotenv/config';
import "reflect-metadata";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import path from "path";
import fs from "fs";
import projectsRouter from "./routes/projects.js";
import tasksRouter from "./routes/tasks.js";
import usersRouter from "./routes/users.js";
import milestonesRouter from "./routes/milestones.js";
import commentsRouter from "./routes/comments.js";
import notificationsRouter from "./routes/notifications.js";
import orgsRouter from "./routes/organizations.js";
import teamsRouter2 from "./routes/teams.js";
import { initDB } from "./db/data-source.js";
import attachmentsRouter from "./routes/attachments.js";
import searchRouter from "./routes/search.js";

// Optional Sentry monitoring (error tracking) using runtime-only import to avoid TS/module resolution
if (process.env.SENTRY_DSN) {
  (async () => {
    try {
      const Sentry = await (new Function('return import("@sentry/node")'))();
      const Profiling = await (new Function('return import("@sentry/profiling-node")'))();
      (Sentry as any).init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
          new (Profiling as any).ProfilingIntegration(),
        ],
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
      } as any);
      // Basic global handlers
      process.on('uncaughtException', (err) => {
        try { (Sentry as any).captureException(err); } catch {}
      });
      process.on('unhandledRejection', (reason) => {
        try { (Sentry as any).captureException(reason); } catch {}
      });
      console.log('[monitoring] Sentry initialized');
    } catch (err) {
      console.warn('[monitoring] Sentry init failed or not installed:', err instanceof Error ? err.message : String(err));
    }
  })();
}

// If a managed Postgres URL is present, relax TLS globally to avoid self-signed cert errors
const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
if (dbUrl) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.warn('[startup] NODE_TLS_REJECT_UNAUTHORIZED=0 set due to DATABASE_URL presence');
  } catch {}
}

const app = express();
// Trust proxy headers so req.protocol reflects HTTPS behind reverse proxies
app.set('trust proxy', 1);

// Configure CORS for production domains via env (comma-separated)
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const corsOptions = allowedOrigins.length ? { origin: allowedOrigins } : undefined;
app.use(cors(corsOptions as any));

// Increase payload limits to support larger JSON bodies (e.g., avatars)
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/users", usersRouter);
app.use("/api/milestones", milestonesRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/orgs", orgsRouter);
app.use("/api/teams", teamsRouter2);
app.use("/api/attachments", attachmentsRouter);
app.use("/api/search", searchRouter);

// Basic error handler with optional Sentry capture
app.use((err: any, _req: any, res: any, _next: any) => {
  try {
    if (process.env.SENTRY_DSN) {
      (new Function('return import("@sentry/node")'))().then((Sentry: any) => {
        try { (Sentry as any).captureException(err); } catch {}
      }).catch(() => {});
    }
  } catch {}
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Serve built UI from ui/dist when present (single-domain deployment)
const uiDist = path.join(process.cwd(), "ui", "dist");
if (fs.existsSync(path.join(uiDist, "index.html"))) {
  app.use(express.static(uiDist));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) return res.status(404).json({ error: "not found" });
    res.sendFile(path.join(uiDist, "index.html"));
  });
}

import http from 'http';
import { initRealtime } from './controllers/realtime.js';

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '0.0.0.0';

await initDB();

const server = http.createServer(app);
initRealtime(server);

server.listen(port, host as any, () => {
  const url = `http://${host}:${port}`;
  const publicDomain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
  const hint = publicDomain ? ` (public: https://${publicDomain})` : '';
  console.log(`API server listening on ${url}${hint}`);
});