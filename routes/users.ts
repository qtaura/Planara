import { Router } from "express";
import { create, getAll, getById, update, remove } from "../db/json.js";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", (_req, res) => {
  const users = getAll("users");
  res.json(users);
});

router.get("/:id", (req, res) => {
  const user = getById("users", req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

router.post("/", (req, res) => {
  const { name, avatar } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const user = create("users", {
    id: randomUUID(),
    name,
    avatar,
  });
  res.status(201).json(user);
});

router.put("/:id", (req, res) => {
  const updated = update("users", req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  const ok = remove("users", req.params.id);
  res.json({ ok });
});

export default router;