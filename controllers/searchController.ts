import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { Comment } from "../models/Comment.js";
import { User } from "../models/User.js";
import { recordSearchEvent } from "../services/searchTelemetry.js";

function sanitizeQuery(q: string): string {
  const s = String(q || "").trim();
  // Limit length to avoid excessive scans
  return s.slice(0, 200);
}

function parseLabels(labels: string | string[] | undefined): string[] {
  if (!labels) return [];
  if (Array.isArray(labels)) return labels.filter(Boolean).map((l) => String(l));
  return String(labels)
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseDate(d?: string | number | Date): Date | undefined {
  if (!d) return undefined;
  try {
    const dt = new Date(d as any);
    if (isNaN(dt.getTime())) return undefined;
    return dt;
  } catch {
    return undefined;
  }
}

export async function searchTasks(req: Request, res: Response) {
  const started = Date.now();
  const userId = (req as any).userId as number | undefined;
  const q = sanitizeQuery(String((req.query as any)?.q || ""));
  const status = (req.query as any)?.status as string | undefined;
  const labels = parseLabels((req.query as any)?.labels);
  const assignee = (req.query as any)?.assignee as string | undefined; // username or usernameLower
  const teamId = Number((req.query as any)?.teamId || 0) || undefined;
  const projectId = Number((req.query as any)?.projectId || 0) || undefined;
  const limit = Math.min(Math.max(Number((req.query as any)?.limit || 25), 1), 100);
  const offset = Math.max(Number((req.query as any)?.offset || 0), 0);

  const repo = AppDataSource.getRepository(Task);
  const qb = repo.createQueryBuilder("task")
    .leftJoin("task.project", "project")
    .leftJoin("task.assignee", "assignee")
    .select(["task.id", "task.title", "task.description", "task.status", "task.priority", "task.labels", "task.dueDate", "project.id", "assignee.id", "assignee.username"]);

  // Scope by team or owner
  if (teamId) {
    qb.andWhere("project.teamId = :teamId", { teamId });
  } else if (userId) {
    qb.andWhere("project.ownerId = :userId", { userId });
  }
  if (projectId) {
    qb.andWhere("project.id = :projectId", { projectId });
  }

  if (q) {
    const ql = `%${q.toLowerCase()}%`;
    qb.andWhere("(task.titleLower LIKE :ql OR LOWER(task.description) LIKE :ql)", { ql });
  }
  if (status) {
    const statuses = String(status).split(",").map((s) => s.trim()).filter(Boolean);
    if (statuses.length) qb.andWhere("task.status IN (:...statuses)", { statuses });
  }
  if (labels.length) {
    // simple-array of labels; match any label via LIKE
    const likes = labels.map((l, i) => `task.labels LIKE :l${i}`);
    likes.forEach((_, i) => qb.setParameter(`l${i}`, `%,${labels[i].toLowerCase()},%`));
    // Also match when only single label present without commas
    const anyLikes = labels.map((l, i) => `LOWER(task.labels) LIKE :any${i}`);
    anyLikes.forEach((_, i) => qb.setParameter(`any${i}`, `%${labels[i].toLowerCase()}%`));
    qb.andWhere(`(${likes.concat(anyLikes).join(" OR ")})`);
  }
  if (assignee) {
    const a = String(assignee).toLowerCase();
    qb.andWhere("(LOWER(assignee.username) = :a OR assignee.usernameLower = :a)", { a });
  }

  qb.limit(limit).offset(offset);
  const results = await qb.getMany();
  const payload = results.map((t) => ({
    type: "task",
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    labels: t.labels || [],
    dueDate: t.dueDate || null,
    projectId: (t.project as any)?.id || null,
    assignee: (t.assignee as any)?.username || null,
  }));
  try {
    await recordSearchEvent({ req, scope: teamId ? "team" : "owner", q, filters: { type: "task", status, labels, assignee, projectId, teamId }, resultCount: payload.length, started });
  } catch {}
  res.json({ items: payload, count: payload.length, limit, offset });
}

export async function searchProjects(req: Request, res: Response) {
  const started = Date.now();
  const userId = (req as any).userId as number | undefined;
  const q = sanitizeQuery(String((req.query as any)?.q || ""));
  const teamId = Number((req.query as any)?.teamId || 0) || undefined;
  const from = parseDate((req.query as any)?.from);
  const to = parseDate((req.query as any)?.to);
  const limit = Math.min(Math.max(Number((req.query as any)?.limit || 25), 1), 100);
  const offset = Math.max(Number((req.query as any)?.offset || 0), 0);

  const repo = AppDataSource.getRepository(Project);
  const qb = repo.createQueryBuilder("project").leftJoin("project.owner", "owner").select(["project.id", "project.name", "project.description", "project.createdAt", "project.archived", "project.favorite"]);

  if (teamId) qb.andWhere("project.teamId = :teamId", { teamId });
  else if (userId) qb.andWhere("project.ownerId = :userId", { userId });

  if (q) qb.andWhere("(LOWER(project.name) LIKE :q OR LOWER(project.description) LIKE :q)", { q: `%${q.toLowerCase()}%` });
  if (from) qb.andWhere("project.createdAt >= :from", { from });
  if (to) qb.andWhere("project.createdAt <= :to", { to });

  qb.limit(limit).offset(offset);
  const results = await qb.getMany();
  const payload = results.map((p) => ({ type: "project", id: p.id, name: p.name, description: p.description, createdAt: p.createdAt, archived: p.archived, favorite: p.favorite }));
  try { await recordSearchEvent({ req, scope: teamId ? "team" : "owner", q, filters: { type: "project", from, to, teamId }, resultCount: payload.length, started }); } catch {}
  res.json({ items: payload, count: payload.length, limit, offset });
}

export async function searchComments(req: Request, res: Response) {
  const started = Date.now();
  const userId = (req as any).userId as number | undefined;
  const q = sanitizeQuery(String((req.query as any)?.q || ""));
  const teamId = Number((req.query as any)?.teamId || 0) || undefined;
  const projectId = Number((req.query as any)?.projectId || 0) || undefined;
  const from = parseDate((req.query as any)?.from);
  const to = parseDate((req.query as any)?.to);
  const limit = Math.min(Math.max(Number((req.query as any)?.limit || 25), 1), 100);
  const offset = Math.max(Number((req.query as any)?.offset || 0), 0);

  const repo = AppDataSource.getRepository(Comment);
  const qb = repo.createQueryBuilder("comment")
    .leftJoin("comment.task", "task")
    .leftJoin("task.project", "project")
    .leftJoin("comment.author", "author")
    .select(["comment.id", "comment.content", "comment.createdAt", "task.id", "project.id", "author.id", "author.username"]);

  if (teamId) qb.andWhere("project.teamId = :teamId", { teamId });
  else if (userId) qb.andWhere("project.ownerId = :userId", { userId });
  if (projectId) qb.andWhere("project.id = :projectId", { projectId });

  if (q) qb.andWhere("LOWER(comment.content) LIKE :q", { q: `%${q.toLowerCase()}%` });
  if (from) qb.andWhere("comment.createdAt >= :from", { from });
  if (to) qb.andWhere("comment.createdAt <= :to", { to });

  qb.limit(limit).offset(offset);
  const results = await qb.getMany();
  const payload = results.map((c) => ({ type: "comment", id: c.id, content: c.content, createdAt: c.createdAt, taskId: (c.task as any)?.id || null, projectId: (c.task?.project as any)?.id || null, author: (c.author as any)?.username || null }));
  try { await recordSearchEvent({ req, scope: teamId ? "team" : "owner", q, filters: { type: "comment", from, to, projectId, teamId }, resultCount: payload.length, started }); } catch {}
  res.json({ items: payload, count: payload.length, limit, offset });
}