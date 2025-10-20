import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";

export async function getProjects(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const repo = AppDataSource.getRepository(Project);
  const projects = await repo.find({
    where: userId ? { owner: { id: userId } } : {},
    relations: { tasks: true, milestones: true, owner: true },
  });
  res.json(projects);
}

export async function createProject(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const { name, description, archived, favorite } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  const repo = AppDataSource.getRepository(Project);
  const userRepo = AppDataSource.getRepository(User);
  const owner = await userRepo.findOne({ where: { id: userId } });
  if (!owner) return res.status(401).json({ error: "unauthorized" });
  const project = repo.create({ name, description, archived: !!archived, favorite: !!favorite, owner });
  await repo.save(project);
  res.status(201).json(project);
}

export async function updateProject(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Project);
  const project = await repo.findOne({ where: { id }, relations: { owner: true } });
  if (!project) return res.status(404).json({ error: "project not found" });
  if (userId && project.owner?.id !== userId) return res.status(403).json({ error: "forbidden" });
  const { name, description, archived, favorite } = req.body;
  if (name) project.name = name;
  if (typeof description !== "undefined") project.description = description;
  if (typeof archived !== "undefined") project.archived = !!archived;
  if (typeof favorite !== "undefined") project.favorite = !!favorite;
  await repo.save(project);
  res.json(project);
}

export async function deleteProject(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Project);
  const project = await repo.findOne({ where: { id }, relations: { owner: true } });
  if (!project) return res.status(404).json({ error: "project not found" });
  if (userId && project.owner?.id !== userId) return res.status(403).json({ error: "forbidden" });
  await repo.remove(project);
  res.json({ ok: true });
}