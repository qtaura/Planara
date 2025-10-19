import { Router } from "express";
import { create, getAll, getById, update, remove } from "../db/json.js";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", (_req, res) => {
  const projects = getAll("projects");
  res.json(projects);
});

router.get("/:id", (req, res) => {
  const project = getById("projects", req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  res.json(project);
});

router.post("/", (req, res) => {
  const { name, color, favorite, githubLinked } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const project = create("projects", {
    id: randomUUID(),
    name,
    color,
    favorite: Boolean(favorite),
    githubLinked: Boolean(githubLinked),
  });
  res.status(201).json(project);
});

router.put("/:id", (req, res) => {
  const updated = update("projects", req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  const ok = remove("projects", req.params.id);
  res.json({ ok });
});

export default router;