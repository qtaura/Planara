import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Milestone } from "../models/Milestone.js";
import { Project } from "../models/Project.js";

export async function getMilestones(req: Request, res: Response) {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const repo = AppDataSource.getRepository(Milestone);
  const where = projectId ? { project: { id: projectId } } : {};
  const milestones = await repo.find({ where, relations: { project: true } });
  res.json(milestones);
}

export async function createMilestone(req: Request, res: Response) {
  const { title, projectId, progressPercent, dueDate } = req.body;
  if (!title || !projectId) return res.status(400).json({ error: "title and projectId are required" });
  const projectRepo = AppDataSource.getRepository(Project);
  const repo = AppDataSource.getRepository(Milestone);
  const project = await projectRepo.findOne({ where: { id: Number(projectId) } });
  if (!project) return res.status(404).json({ error: "project not found" });
  const milestone = repo.create({ title, project, progressPercent, dueDate });
  await repo.save(milestone);
  res.status(201).json(milestone);
}

export async function updateMilestone(req: Request, res: Response) {
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Milestone);
  const milestone = await repo.findOne({ where: { id }, relations: { project: true } });
  if (!milestone) return res.status(404).json({ error: "milestone not found" });
  const { title, progressPercent, dueDate } = req.body;
  if (title) milestone.title = title;
  if (typeof progressPercent !== "undefined") milestone.progressPercent = progressPercent;
  if (typeof dueDate !== "undefined") milestone.dueDate = dueDate;
  await repo.save(milestone);
  res.json(milestone);
}

export async function deleteMilestone(req: Request, res: Response) {
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Milestone);
  const milestone = await repo.findOne({ where: { id } });
  if (!milestone) return res.status(404).json({ error: "milestone not found" });
  await repo.remove(milestone);
  res.json({ ok: true });
}