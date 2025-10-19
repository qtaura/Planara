import { Router } from "express";
import { create, getAll, getById, update, remove } from "../db/json.js";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", (_req, res) => {
  const tasks = getAll("tasks");
  res.json(tasks);
});

router.get("/:id", (req, res) => {
  const task = getById("tasks", req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(task);
});

router.post("/", (req, res) => {
  const { title, description, status, assigneeId, projectId } = req.body || {};
  if (!title) return res.status(400).json({ error: "title is required" });
  const task = create("tasks", {
    id: randomUUID(),
    title,
    description,
    status,
    assigneeId,
    projectId,
  });
  res.status(201).json(task);
});

router.put("/:id", (req, res) => {
  const updated = update("tasks", req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  const ok = remove("tasks", req.params.id);
  res.json({ ok });
});

export default router;