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
import { initDB } from "./db/data-source.js";

const app = express();
// Trust proxy headers so req.protocol reflects HTTPS behind reverse proxies
app.set('trust proxy', 1);

// Configure CORS for production domains via env (comma-separated)
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const corsOptions = allowedOrigins.length ? { origin: allowedOrigins } : undefined;
app.use(cors(corsOptions as any));

app.use(bodyParser.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/users", usersRouter);
app.use("/api/milestones", milestonesRouter);
app.use("/api/comments", commentsRouter);

// Serve built UI from ui/dist when present (single-domain deployment)
const uiDist = path.join(process.cwd(), "ui", "dist");
if (fs.existsSync(path.join(uiDist, "index.html"))) {
  app.use(express.static(uiDist));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) return res.status(404).json({ error: "not found" });
    res.sendFile(path.join(uiDist, "index.html"));
  });
}

const port = Number(process.env.PORT) || 3001;

await initDB();

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});