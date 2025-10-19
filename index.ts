import express from "express";
import cors from "cors";
import morgan from "morgan";
import projectsRouter from "./routes/projects.js";
import tasksRouter from "./routes/tasks.js";
import usersRouter from "./routes/users.js";
import { ensureInitialized } from "./db/json.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/users", usersRouter);

const port = Number(process.env.PORT) || 3001;

await ensureInitialized();

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});