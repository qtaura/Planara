import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source.js';
import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { Milestone } from '../models/Milestone.js';
import { User } from '../models/User.js';

// Auto-calculate milestone progress based on task completion
async function recalcMilestoneProgress(milestoneId: number) {
  const taskRepo = AppDataSource.getRepository(Task);
  const milestoneRepo = AppDataSource.getRepository(Milestone);

  // Fetch tasks explicitly to avoid relation where-count quirks
  const tasks = await taskRepo.find({ where: { milestone: { id: milestoneId } } });
  const total = tasks.length;
  const done = tasks.filter((t: Task) => t.status === 'done').length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const milestone = await milestoneRepo.findOne({ where: { id: milestoneId } });
  if (milestone) {
    milestone.progressPercent = percent;
    await milestoneRepo.save(milestone);
  }
}

export const getTasks = async (req: Request, res: Response) => {
  const userId = (req as any).userId as number | undefined;
  const repo = AppDataSource.getRepository(Task);
  const projectRepo = AppDataSource.getRepository(Project);
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;
  const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  const taskRepo = AppDataSource.getRepository(Task);
  if (projectId) {
    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: { team: true },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (teamId && project.team && project.team.id !== teamId) {
      return res.status(403).json({ error: 'Cross-team access forbidden' });
    }
    const [tasks, total] = await taskRepo.findAndCount({
      where: { project: { id: projectId } },
      relations: { project: true },
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
    return res.json({
      items: tasks,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  }

  let where: any = {};
  if (projectId) {
    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: { owner: true },
    });
    if (!project || (userId && project.owner?.id !== userId)) {
      return res.status(404).json({ error: 'project not found' });
    }
    where = { project: { id: projectId } };
  } else if (userId) {
    where = { project: { owner: { id: userId } } };
  }

  const [tasks, total] = await repo.findAndCount({
    where,
    relations: { project: true, milestone: true, assignee: true, comments: true },
    take: limit,
    skip: offset,
    order: { createdAt: 'DESC' },
  });

  res.json({
    items: tasks,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  });
};

export async function createTask(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const { title, description, status, priority, labels, projectId, milestoneId, assigneeId } =
    req.body;
  if (!title || !projectId)
    return res.status(400).json({ error: 'title and projectId are required' });
  const repo = AppDataSource.getRepository(Task);
  const projectRepo = AppDataSource.getRepository(Project);
  const milestoneRepo = AppDataSource.getRepository(Milestone);
  const userRepo = AppDataSource.getRepository(User);

  const project = await projectRepo.findOne({
    where: { id: Number(projectId) },
    relations: { owner: true },
  });
  if (!project) return res.status(404).json({ error: 'project not found' });
  if (userId && project.owner?.id !== userId) return res.status(403).json({ error: 'forbidden' });

  const task = repo.create({ title, description, status, priority, labels, project });
  task.titleLower = String(title).toLowerCase();
  if (milestoneId) {
    const milestone = await milestoneRepo.findOne({ where: { id: Number(milestoneId) } });
    if (milestone) task.milestone = milestone;
  }
  if (assigneeId) {
    const assignee = await userRepo.findOne({ where: { id: Number(assigneeId) } });
    if (assignee) task.assignee = assignee;
  }
  await repo.save(task);
  if (task.milestone?.id) {
    await recalcMilestoneProgress(task.milestone.id);
  }
  try {
    const { getIO } = await import('./realtime.js');
    const io = getIO();
    if (io && project?.id) {
      io.to(`project:${project.id}`).emit('task:created', { taskId: task.id, task });
    }
  } catch {}
  res.status(201).json(task);
}

export async function updateTask(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const teamId = Number((req.query as any)?.teamId || (req.body as any)?.teamId || 0) || undefined;
  const repo = AppDataSource.getRepository(Task);
  const task = await repo.findOne({ where: { id }, relations: { project: { owner: true } } });
  if (!task) return res.status(404).json({ error: 'task not found' });
  // Skip strict owner check when team-based RBAC context is provided (middleware already enforced)
  if (!teamId && userId && task.project?.owner?.id !== userId)
    return res.status(403).json({ error: 'forbidden' });
  const { title, description, status, priority, dueDate, assigneeId } = req.body;
  if (title) {
    task.title = title;
    task.titleLower = String(title).toLowerCase();
  }
  if (typeof description !== 'undefined') task.description = description;
  if (status) task.status = status;
  if (priority) task.priority = priority;
  if (dueDate) task.dueDate = new Date(dueDate);
  if (assigneeId) {
    const userRepo = AppDataSource.getRepository(User);
    const assignee = await userRepo.findOne({ where: { id: assigneeId } });
    task.assignee = assignee || null;
  }
  await repo.save(task);
  try {
    const { getIO } = await import('./realtime.js');
    const io = getIO();
    const projectId = (task.project as any)?.id || req.body?.projectId;
    if (io && projectId) {
      io.to(`project:${projectId}`).emit('task:updated', { taskId: task.id, task });
    }
  } catch {}
  res.json(task);
}

export async function deleteTask(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const teamId = Number((req.query as any)?.teamId || (req.body as any)?.teamId || 0) || undefined;
  const repo = AppDataSource.getRepository(Task);
  const task = await repo.findOne({ where: { id }, relations: { project: { owner: true } } });
  if (!task) return res.status(404).json({ error: 'task not found' });
  // Allow delete per RBAC when team context provided; otherwise enforce owner-only
  if (!teamId && userId && task.project?.owner?.id !== userId)
    return res.status(403).json({ error: 'forbidden' });
  await repo.remove(task);
  res.json({ ok: true });
}