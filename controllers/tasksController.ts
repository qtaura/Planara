import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Task } from "../models/Task.js";
import { Project } from "../models/Project.js";
import { Milestone } from "../models/Milestone.js";
import { User } from "../models/User.js";

export async function getTasks(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const repo = AppDataSource.getRepository(Task);
  const projectRepo = AppDataSource.getRepository(Project);
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;

  let where: any = {};
  if (projectId) {
    const project = await projectRepo.findOne({ where: { id: projectId }, relations: { owner: true } });
    if (!project || (userId && project.owner?.id !== userId)) {
      return res.status(404).json({ error: "project not found" });
    }
    where = { project: { id: projectId } };
  } else if (userId) {
    where = { project: { owner: { id: userId } } };
  }

  const tasks = await repo.find({
    where,
    relations: { project: true, milestone: true, assignee: true, comments: true },
  });
  res.json(tasks);
}

export async function createTask(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const { title, description, status, priority, labels, projectId, milestoneId, assigneeId } = req.body;
  if (!title || !projectId) return res.status(400).json({ error: "title and projectId are required" });
  const repo = AppDataSource.getRepository(Task);
  const projectRepo = AppDataSource.getRepository(Project);
  const milestoneRepo = AppDataSource.getRepository(Milestone);
  const userRepo = AppDataSource.getRepository(User);

  const project = await projectRepo.findOne({ where: { id: Number(projectId) }, relations: { owner: true } });
  if (!project) return res.status(404).json({ error: "project not found" });
  if (userId && project.owner?.id !== userId) return res.status(403).json({ error: "forbidden" });

  const task = repo.create({ title, description, status, priority, labels, project });
  if (milestoneId) {
    const milestone = await milestoneRepo.findOne({ where: { id: Number(milestoneId) } });
    if (milestone) task.milestone = milestone;
  }
  if (assigneeId) {
    const assignee = await userRepo.findOne({ where: { id: Number(assigneeId) } });
    if (assignee) task.assignee = assignee;
  }
  await repo.save(task);
  res.status(201).json(task);
}

export async function updateTask(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Task);
  const task = await repo.findOne({ where: { id }, relations: { project: true, milestone: true, assignee: true } });
  if (!task) return res.status(404).json({ error: "task not found" });
  const projectRepo = AppDataSource.getRepository(Project);
  const project = task.project ? await projectRepo.findOne({ where: { id: task.project.id }, relations: { owner: true } }) : null;
  if (!project) return res.status(404).json({ error: "project not found" });
  if (userId && project.owner?.id !== userId) return res.status(403).json({ error: "forbidden" });

  const { title, description, status, priority, labels, milestoneId, assigneeId } = req.body;
  if (title) task.title = title;
  if (typeof description !== "undefined") task.description = description;
  if (typeof status !== "undefined") task.status = status;
  if (typeof priority !== "undefined") task.priority = priority;
  if (typeof labels !== "undefined") task.labels = labels;

  if (typeof milestoneId !== "undefined") {
    const milestoneRepo = AppDataSource.getRepository(Milestone);
    if (milestoneId) {
      const milestone = await milestoneRepo.findOne({ where: { id: Number(milestoneId) } });
      task.milestone = milestone || null;
    } else {
      task.milestone = null;
    }
  }
  if (typeof assigneeId !== "undefined") {
    const userRepo = AppDataSource.getRepository(User);
    if (assigneeId) {
      const assignee = await userRepo.findOne({ where: { id: Number(assigneeId) } });
      task.assignee = assignee || null;
    } else {
      task.assignee = null;
    }
  }

  await repo.save(task);
  res.json(task);
}

export async function deleteTask(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Task);
  const task = await repo.findOne({ where: { id }, relations: { project: true } });
  if (!task) return res.status(404).json({ error: "task not found" });
  const projectRepo = AppDataSource.getRepository(Project);
  const project = task.project ? await projectRepo.findOne({ where: { id: task.project.id }, relations: { owner: true } }) : null;
  if (!project) return res.status(404).json({ error: "project not found" });
  if (userId && project.owner?.id !== userId) return res.status(403).json({ error: "forbidden" });
  await repo.remove(task);
  res.json({ ok: true });
}