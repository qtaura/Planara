import "reflect-metadata";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import projectsRouter from "./routes/projects.js";
import tasksRouter from "./routes/tasks.js";
import usersRouter from "./routes/users.js";
import milestonesRouter from "./routes/milestones.js";
import commentsRouter from "./routes/comments.js";
import { initDB } from "./db/data-source.js";

const app = express();

app.use(cors());
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

const port = Number(process.env.PORT) || 3001;

await initDB();

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});