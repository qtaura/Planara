import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source.js';
import { Organization } from '../models/Organization.js';
import { Team } from '../models/Team.js';
import { Membership } from '../models/Membership.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Milestone } from '../models/Milestone.js';
import { Attachment } from '../models/Attachment.js';
import { Notification } from '../models/Notification.js';

function sanitizeProject(p: Project) {
  return {
    id: p.id,
    name: p.name,
    description: p.description || null,
    createdAt: p.createdAt,
    archived: !!p.archived,
    favorite: !!p.favorite,
    teamId: (p.team as any)?.id ?? null,
    ownerId: (p.owner as any)?.id ?? null,
  };
}

function sanitizeTask(t: Task) {
  return {
    id: t.id,
    title: t.title,
    description: t.description || null,
    status: t.status,
    priority: t.priority,
    labels: t.labels || [],
    dueDate: t.dueDate || null,
    milestoneId: (t.milestone as any)?.id ?? null,
    assigneeId: (t.assignee as any)?.id ?? null,
    createdAt: t.createdAt,
  };
}

function sanitizeAttachment(a: Attachment) {
  return {
    id: a.id,
    filename: a.filename,
    mimeType: a.mimeType,
    size: a.size,
    createdAt: a.createdAt,
    latestVersionNumber: a.latestVersionNumber,
    versionCount: a.versionCount,
    taskId: (a.task as any)?.id ?? null,
    projectId: (a.project as any)?.id ?? null,
  };
}

function sanitizeMilestone(m: Milestone) {
  return {
    id: m.id,
    title: m.title,
    progressPercent: m.progressPercent,
    dueDate: m.dueDate ?? null,
    projectId: (m as any).project?.id ?? undefined,
  };
}

function sanitizeNotification(n: Notification) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    read: !!n.read,
    readAt: n.readAt || null,
    channel: n.channel,
    createdAt: n.createdAt,
    projectId: (n.project as any)?.id ?? null,
    taskId: (n.task as any)?.id ?? null,
    actionUrl: n.actionUrl || null,
  };
}

export async function exportProject(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'project id required' });

  try {
    const projectRepo = AppDataSource.getRepository(Project);
    const taskRepo = AppDataSource.getRepository(Task);
    const milestoneRepo = AppDataSource.getRepository(Milestone);
    const attachmentRepo = AppDataSource.getRepository(Attachment);
    const notificationRepo = AppDataSource.getRepository(Notification);

    const project = await projectRepo.findOne({
      where: { id },
      relations: { owner: true, team: true },
    });
    if (!project || project.deletedAt) return res.status(404).json({ error: 'project not found' });

    const tasks = await taskRepo.find({
      where: { project: { id } },
      relations: { assignee: true, milestone: true },
      order: { createdAt: 'ASC' },
    });

    const milestones = await milestoneRepo.find({
      where: { project: { id } },
      order: { id: 'ASC' },
    });
    const attachments = await attachmentRepo.find({
      where: { project: { id } },
      relations: { task: true, project: true },
    });

    const userId = (req as any).userId as number | undefined;
    const notifications = userId
      ? await notificationRepo.find({
          where: { project: { id }, user: { id: userId } },
          relations: { project: true, task: true },
          order: { createdAt: 'DESC' },
        })
      : [];

    const payload = {
      type: 'project',
      project: sanitizeProject(project),
      tasks: tasks.map(sanitizeTask),
      milestones: milestones.map(sanitizeMilestone),
      attachments: attachments.map(sanitizeAttachment),
      notifications: notifications.map(sanitizeNotification),
      counts: {
        tasks: tasks.length,
        milestones: milestones.length,
        attachments: attachments.length,
        notifications: notifications.length,
      },
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="project-${id}-export.json"`);
    res.status(200).json(payload);
  } catch (error) {
    console.error('Error exporting project:', error);
    res.status(500).json({ error: 'failed to export project' });
  }
}

export async function exportTeam(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'team id required' });

  try {
    const teamRepo = AppDataSource.getRepository(Team);
    const membershipRepo = AppDataSource.getRepository(Membership);
    const projectRepo = AppDataSource.getRepository(Project);

    const team = await teamRepo.findOne({ where: { id }, relations: { org: true } });
    if (!team) return res.status(404).json({ error: 'team not found' });

    const memberships = await membershipRepo.find({
      where: { team: { id } },
      relations: { user: true, org: true, team: true },
    });
    const projects = await projectRepo.find({
      where: { team: { id }, deletedAt: null as any },
      relations: { owner: true, team: true },
    });

    const payload = {
      type: 'team',
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        orgId: (team.org as any)?.id ?? null,
        createdAt: team.createdAt,
      },
      members: memberships.map((m) => ({
        id: m.id,
        userId: (m.user as any)?.id ?? null,
        role: m.role,
        createdAt: m.createdAt,
      })),
      projects: projects.map(sanitizeProject),
      counts: { members: memberships.length, projects: projects.length },
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="team-${id}-export.json"`);
    res.status(200).json(payload);
  } catch (error) {
    console.error('Error exporting team:', error);
    res.status(500).json({ error: 'failed to export team' });
  }
}

export async function exportOrganization(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'organization id required' });

  try {
    const orgRepo = AppDataSource.getRepository(Organization);
    const teamRepo = AppDataSource.getRepository(Team);
    const projectRepo = AppDataSource.getRepository(Project);

    const org = await orgRepo.findOne({ where: { id } });
    if (!org || org.deletedAt) return res.status(404).json({ error: 'organization not found' });

    const teams = await teamRepo.find({
      where: { org: { id } },
      order: { createdAt: 'ASC' },
      relations: { org: true },
    });

    // Fetch projects for all teams in the org
    const teamIds = teams.map((t) => t.id);
    const projects = teamIds.length
      ? await projectRepo
          .createQueryBuilder('project')
          .leftJoin('project.team', 'team')
          .leftJoin('project.owner', 'owner')
          .select(['project', 'team.id', 'owner.id'])
          .where('project.deletedAt IS NULL')
          .andWhere('team.id IN (:...teamIds)', { teamIds })
          .getMany()
      : [];

    const payload = {
      type: 'organization',
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt,
        ownerUserId: org.ownerUserId,
      },
      teams: teams.map((t) => ({ id: t.id, name: t.name, slug: t.slug, createdAt: t.createdAt })),
      projects: projects.map(sanitizeProject),
      counts: { teams: teams.length, projects: projects.length },
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="org-${id}-export.json"`);
    res.status(200).json(payload);
  } catch (error) {
    console.error('Error exporting organization:', error);
    res.status(500).json({ error: 'failed to export organization' });
  }
}
