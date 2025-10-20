import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Milestone } from "../models/Milestone.js";
import { Project } from "../models/Project.js";

export async function getMilestones(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const repo = AppDataSource.getRepository(Milestone);
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

  const milestones = await repo.find({ where, relations: { project: true } });
  res.json(milestones);
}

export async function createMilestone(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const { name, description, dueDate, projectId } = req.body;
  if (!name || !projectId) return res.status(400).json({ error: "name and projectId are required" });
  const repo = AppDataSource.getRepository(Milestone);
  const projectRepo = AppDataSource.getRepository(Project);

  const project = await projectRepo.findOne({ where: { id: Number(projectId) }, relations: { owner: true } });
  if (!project) return res.status(404).json({ error: "project not found" });
  if (userId && project.owner?.id !== userId) return res.status(403).json({ error: "forbidden" });

  const milestone = repo.create({ name, description, dueDate: dueDate ? new Date(dueDate) : null, project, progressPercent: 0 });
  await repo.save(milestone);
  res.status(201).json(milestone);
}

export async function updateMilestone(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Milestone);
  const milestone = await repo.findOne({ where: { id }, relations: { project: true } });
  if (!milestone) return res.status(404).json({ error: "milestone not found" });
  const projectRepo = AppDataSource.getRepository(Project);
  const project = milestone.project ? await projectRepo.findOne({ where: { id: milestone.project.id }, relations: { owner: true } }) : null;
  if (!project) return res.status(404).json({ error: "project not found" });
  if (userId && project.owner?.id !== userId) return res.status(403).json({ error: "forbidden" });

  const { name, description, dueDate } = req.body;
  if (name) milestone.name = name;
  if (typeof description !== "undefined") milestone.description = description;
  if (typeof dueDate !== "undefined") milestone.dueDate = dueDate ? new Date(dueDate) : null;

  await repo.save(milestone);
  res.json(milestone);
}

export async function deleteMilestone(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Milestone);
  const milestone = await repo.findOne({ where: { id }, relations: { project: true } });
  if (!milestone) return res.status(404).json({ error: "milestone not found" });
  const projectRepo = AppDataSource.getRepository(Project);
  const project = milestone.project ? await projectRepo.findOne({ where: { id: milestone.project.id }, relations: { owner: true } }) : null;
  if (!project) return res.status(404).json({ error: "project not found" });
  if (userId && project.owner?.id !== userId) return res.status(403).json({ error: "forbidden" });

  await repo.remove(milestone);
  res.json({ ok: true });
}