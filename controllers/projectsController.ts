import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';

const GRACE_DAYS = Number(process.env.DELETE_GRACE_DAYS || 7);

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;
    const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    const projectRepo = AppDataSource.getRepository(Project);

    let projects: Project[] = [];
    let total: number = 0;

    if (teamId) {
      const qb = projectRepo
        .createQueryBuilder('p')
        .leftJoin('p.team', 't')
        .leftJoin('p.owner', 'o')
        .where('t.id = :teamId', { teamId })
        .andWhere('p.deletedAt IS NULL')
        .orderBy('p.createdAt', 'DESC');
      const [items, count] = await qb.take(limit).skip(offset).getManyAndCount();
      projects = items;
      total = count;
    } else {
      const qb = projectRepo
        .createQueryBuilder('p')
        .leftJoin('p.owner', 'o')
        .leftJoin('p.team', 't')
        .where('o.id = :userId', { userId })
        .andWhere('p.deletedAt IS NULL')
        .orderBy('p.createdAt', 'DESC');
      const [items, count] = await qb.take(limit).skip(offset).getManyAndCount();
      projects = items;
      total = count;
    }

    res.json({
      items: projects,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as number | undefined;
    const { name, description, teamId } = req.body;

    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const projectRepo = AppDataSource.getRepository(Project);
    const userRepo = AppDataSource.getRepository(User);
    const teamRepo = AppDataSource.getRepository(Team);

    const owner = await userRepo.findOneByOrFail({ id: userId });
    const project = new Project();
    project.name = name;
    project.description = description;
    project.owner = owner;

    if (teamId) {
      const team = await teamRepo.findOne({
        where: { id: Number(teamId) },
        relations: { org: true },
      });
      if (!team) return res.status(404).json({ error: 'Team not found' });
      project.team = team;
    }

    await projectRepo.save(project);
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const projectId = Number(req.params.id);
    const { name, description, archived, favorite, teamId } = req.body;

    const projectRepo = AppDataSource.getRepository(Project);
    const teamRepo = AppDataSource.getRepository(Team);

    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: { owner: true, team: true },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.deletedAt)
      return res.status(400).json({ error: 'cannot update a deleted project' });

    // Personal projects: owner must match when no team context provided
    if (!teamId && project.owner?.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // If teamId provided, enforce org boundary: project.team must match
    if (teamId) {
      const team = await teamRepo.findOne({
        where: { id: Number(teamId) },
        relations: { org: true },
      });
      if (!team) return res.status(404).json({ error: 'Team not found' });
      if (project.team && project.team.id !== team.id) {
        return res.status(403).json({ error: 'Cross-team update forbidden' });
      }
      project.team = team; // allow assigning if currently null or matching
    }

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (archived !== undefined) project.archived = archived;
    if (favorite !== undefined) project.favorite = favorite;

    await projectRepo.save(project);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const projectId = Number(req.params.id);
    const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;

    const projectRepo = AppDataSource.getRepository(Project);

    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: { owner: true, team: true },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Personal projects: owner must match when no team context provided
    if (!teamId && project.owner?.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // If teamId provided, enforce cross-team boundary
    if (teamId && project.team && project.team.id !== teamId) {
      return res.status(403).json({ error: 'Cross-team delete forbidden' });
    }

    if (project.deletedAt) return res.status(400).json({ error: 'project already deleted' });

    const now = new Date();
    project.deletedAt = now;
    project.deleteGraceUntil = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
    await projectRepo.save(project);

    res.json({ success: true, graceUntil: project.deleteGraceUntil?.toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

export const recoverProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const projectId = Number(req.params.id);
    const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;

    const projectRepo = AppDataSource.getRepository(Project);

    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: { owner: true, team: true },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Personal projects: owner must match when no team context provided
    if (!teamId && project.owner?.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // If teamId provided, enforce cross-team boundary
    if (teamId && project.team && project.team.id !== teamId) {
      return res.status(403).json({ error: 'Cross-team recover forbidden' });
    }

    if (!project.deletedAt) return res.status(400).json({ error: 'project is not deleted' });
    const now = new Date();
    const graceUntil = project.deleteGraceUntil ? new Date(project.deleteGraceUntil) : null;
    if (graceUntil && now > graceUntil) {
      return res.status(410).json({ error: 'grace period expired' });
    }

    project.deletedAt = null as any;
    project.deleteGraceUntil = null as any;
    await projectRepo.save(project);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to recover project' });
  }
};
