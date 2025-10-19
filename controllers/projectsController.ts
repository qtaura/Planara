import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Project } from "../models/Project.js";

export async function getProjects(_req: Request, res: Response) {
  const repo = AppDataSource.getRepository(Project);
  const projects = await repo.find({ relations: { tasks: true, milestones: true } });
  res.json(projects);
}

export async function createProject(req: Request, res: Response) {
  const { name, description, archived, favorite } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const repo = AppDataSource.getRepository(Project);
  const project = repo.create({ name, description, archived: !!archived, favorite: !!favorite });
  await repo.save(project);
  res.status(201).json(project);
}

export async function updateProject(req: Request, res: Response) {
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Project);
  const project = await repo.findOne({ where: { id } });
  if (!project) return res.status(404).json({ error: "project not found" });
  const { name, description, archived, favorite } = req.body;
  if (name) project.name = name;
  if (typeof description !== "undefined") project.description = description;
  if (typeof archived !== "undefined") project.archived = !!archived;
  if (typeof favorite !== "undefined") project.favorite = !!favorite;
  await repo.save(project);
  res.json(project);
}

export async function deleteProject(req: Request, res: Response) {
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Project);
  const project = await repo.findOne({ where: { id } });
  if (!project) return res.status(404).json({ error: "project not found" });
  await repo.remove(project);
  res.json({ ok: true });
}