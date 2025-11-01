import { Request, Response } from 'express';
import { verifySignature, WebhookProvider } from '../services/webhookService.js';
import { AppDataSource } from '../db/data-source.js';
import { ExternalLink } from '../models/ExternalLink.js';
import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { IntegrationSettings } from '../models/IntegrationSettings.js';
import { User } from '../models/User.js';

// Environment-driven secrets for inbound verification
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev_webhook_secret';
const SLACK_SECRET = process.env.SLACK_SECRET || WEBHOOK_SECRET;

export async function inboundWebhook(req: Request, res: Response) {
  const provider = String(req.params.provider || 'custom').toLowerCase() as WebhookProvider;
  const secret = provider === 'slack' ? SLACK_SECRET : WEBHOOK_SECRET;

  if (!verifySignature(req, secret)) {
    return res.status(401).json({ error: 'invalid signature' });
  }

  // For now, just acknowledge and log a minimal response
  res.json({ ok: true, provider });
}

export async function slackSlashCommand(req: Request, res: Response) {
  // Slack slash commands post form-encoded payload usually; here we assume JSON for simplicity
  if (!verifySignature(req, SLACK_SECRET)) {
    return res.status(401).json({ error: 'invalid signature' });
  }

  // Stub: create a task from command text, etc.
  // Respond with an ephemeral message structure Slack expects (simplified)
  res.json({ response_type: 'ephemeral', text: 'Command received. Task creation is stubbed.' });
}

export async function slackDigest(req: Request, res: Response) {
  // Admin-triggered digest generation (stub)
  if (!verifySignature(req, SLACK_SECRET)) {
    return res.status(401).json({ error: 'invalid signature' });
  }
  res.json({ ok: true, status: 'digest enqueued' });
}

export async function linkExternalTicket(req: Request, res: Response) {
  const { taskId, provider, externalId, url, title, status, metadata } = req.body || {};
  if (!taskId || !provider || !externalId || !url) {
    return res.status(400).json({ error: 'taskId, provider, externalId, url required' });
  }

  try {
    const taskRepo = AppDataSource.getRepository(Task);
    const linkRepo = AppDataSource.getRepository(ExternalLink);

    // Verify task exists
    const task = await taskRepo.findOne({ where: { id: taskId } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check for existing link with same provider
    const existingLink = await linkRepo.findOne({
      where: { taskId, provider },
    });

    if (existingLink) {
      // Update existing link
      existingLink.externalId = externalId;
      existingLink.url = url;
      existingLink.title = title;
      existingLink.status = status;
      existingLink.metadata = metadata;
      existingLink.updatedAt = new Date();

      await linkRepo.save(existingLink);
      res.json({ ok: true, linkId: existingLink.id, action: 'updated' });
    } else {
      // Create new link
      const newLink = linkRepo.create({
        taskId,
        provider,
        externalId,
        url,
        title,
        status,
        metadata,
        createdBy: (req as any).user?.id || 1, // Default to user 1 if no auth context
      });

      const savedLink = await linkRepo.save(newLink);
      res.json({ ok: true, linkId: savedLink.id, action: 'created' });
    }
  } catch (error) {
    console.error('Error linking external ticket:', error);
    res.status(500).json({ error: 'Failed to link external ticket' });
  }
}

export async function syncStatus(req: Request, res: Response) {
  const { taskId, provider } = req.body || {};
  if (!taskId || !provider) {
    return res.status(400).json({ error: 'taskId and provider required' });
  }

  try {
    const linkRepo = AppDataSource.getRepository(ExternalLink);

    // Find the external link
    const link = await linkRepo.findOne({
      where: { taskId, provider },
      relations: ['task'],
    });

    if (!link) {
      return res.status(404).json({ error: 'External link not found' });
    }

    // Stub: In a real implementation, this would call provider APIs
    // For now, just update the lastSyncAt timestamp
    link.lastSyncAt = new Date();
    await linkRepo.save(link);

    res.json({
      ok: true,
      taskId,
      provider,
      externalId: link.externalId,
      status: link.status || 'unknown',
      lastSyncAt: link.lastSyncAt,
      message: 'Status sync completed (stubbed)',
    });
  } catch (error) {
    console.error('Error syncing status:', error);
    res.status(500).json({ error: 'Failed to sync status' });
  }
}

export async function getExternalLinks(req: Request, res: Response) {
  const { taskId } = req.params;
  if (!taskId) {
    return res.status(400).json({ error: 'taskId parameter required' });
  }

  try {
    const linkRepo = AppDataSource.getRepository(ExternalLink);
    const links = await linkRepo.find({
      where: { taskId: parseInt(taskId) },
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });

    res.json({ ok: true, links });
  } catch (error) {
    console.error('Error fetching external links:', error);
    res.status(500).json({ error: 'Failed to fetch external links' });
  }
}

export async function deleteExternalLink(req: Request, res: Response) {
  const { linkId } = req.params;
  if (!linkId) {
    return res.status(400).json({ error: 'linkId parameter required' });
  }

  try {
    const linkRepo = AppDataSource.getRepository(ExternalLink);
    const result = await linkRepo.delete({ id: parseInt(linkId) });

    if (result.affected === 0) {
      return res.status(404).json({ error: 'External link not found' });
    }

    res.json({ ok: true, message: 'External link deleted' });
  } catch (error) {
    console.error('Error deleting external link:', error);
    res.status(500).json({ error: 'Failed to delete external link' });
  }
}

export async function exportCalendar(req: Request, res: Response) {
  const { projectId, userId } = req.query;

  try {
    const taskRepo = AppDataSource.getRepository(Task);
    const whereClause: any = {};

    if (projectId) whereClause.projectId = parseInt(projectId as string);
    if (userId) whereClause.assigneeId = parseInt(userId as string);

    const tasks = await taskRepo.find({
      where: whereClause,
      relations: ['project', 'assignee'],
    });

    // Generate ICS format
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Planara//Task Calendar//EN',
      'CALSCALE:GREGORIAN',
    ];

    tasks.forEach((task) => {
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const dateStr = dueDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        icsLines.push(
          'BEGIN:VEVENT',
          `UID:task-${task.id}@planara.org`,
          `DTSTART:${dateStr}`,
          `DTEND:${dateStr}`,
          `SUMMARY:${task.title.replace(/[,;\\]/g, '\\$&')}`,
          `DESCRIPTION:${(task.description || '').replace(/[,;\\]/g, '\\$&')}`,
          `STATUS:${task.status?.toUpperCase() || 'NEEDS-ACTION'}`,
          'END:VEVENT'
        );
      }
    });

    icsLines.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="planara-tasks.ics"');
    res.send(icsLines.join('\r\n'));
  } catch (error) {
    console.error('Error exporting calendar:', error);
    res.status(500).json({ error: 'Failed to export calendar' });
  }
}

export async function importCalendar(req: Request, res: Response) {
  const projectId = parseInt(
    (req.query.projectId as string) || (req.body?.projectId as string) || ''
  );
  const assigneeId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

  if (!Number.isFinite(projectId)) {
    return res.status(400).json({ error: 'projectId required to import tasks' });
  }

  try {
    const projectRepo = AppDataSource.getRepository(Project);
    const taskRepo = AppDataSource.getRepository(Task);
    const userRepo = AppDataSource.getRepository(User);

    const project = await projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const rq = req as Request & { rawBody?: Buffer } & { text?: string } & { userId?: number };
    const raw =
      rq.text || (rq.rawBody ? rq.rawBody.toString('utf8') : (req.body?.ics as string) || '');
    if (!raw) {
      return res.status(400).json({ error: 'ICS content required in request body' });
    }

    // Pre-resolve assignee from auth context if not provided
    const candidateAssigneeId = assigneeId || rq.userId;
    const resolvedAssignee = candidateAssigneeId
      ? await userRepo.findOne({ where: { id: Number(candidateAssigneeId) } })
      : null;

    // Minimal ICS parser for VEVENT blocks
    const lines = raw.replace(/\r\n/g, '\n').split('\n');
    const events: Array<Record<string, string>> = [];
    let current: Record<string, string> | null = null;

    for (const line of lines) {
      const l = line.trim();
      if (l === 'BEGIN:VEVENT') {
        current = {};
      } else if (l === 'END:VEVENT') {
        if (current) events.push(current);
        current = null;
      } else if (current && l) {
        // Handle folded lines (starts with space) - simplistic: ignore for now
        const [keyPart, ...rest] = l.split(':');
        const value = rest.join(':');
        const key = keyPart.split(';')[0].toUpperCase();
        current[key] = value;
      }
    }

    const parseIcsDate = (val?: string): Date | undefined => {
      if (!val) return undefined;
      // Expect format YYYYMMDDTHHMMSSZ or YYYYMMDD
      const m = val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z)?$/);
      if (!m) return undefined;
      const [_, y, mo, d, hh, mm, ss] = m;
      if (hh && mm && ss) {
        return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss));
      }
      return new Date(Date.UTC(+y, +mo - 1, +d));
    };

    let created = 0;
    for (const ev of events) {
      const title = ev['SUMMARY'] || 'Imported Event';
      const description = ev['DESCRIPTION'] || '';
      const dueDate = parseIcsDate(ev['DTSTART']) || parseIcsDate(ev['DTEND']);

      const task = taskRepo.create({
        title,
        titleLower: title.toLowerCase(),
        description,
        status: 'todo',
        priority: 'medium',
        dueDate,
        project,
        assignee: resolvedAssignee || undefined,
      });

      await taskRepo.save(task);
      created += 1;
    }

    res.json({ ok: true, projectId, created, message: 'ICS imported into tasks' });
  } catch (error) {
    console.error('Error importing calendar:', error);
    res.status(500).json({ error: 'Failed to import calendar' });
  }
}

export async function listIntegrationSettings(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const repo = AppDataSource.getRepository(IntegrationSettings);
    const items = await repo.find({ where: { userId }, order: { updatedAt: 'DESC' } });
    res.json({ ok: true, items });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list integration settings' });
  }
}

export async function getIntegrationSetting(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number;
    const provider = String(req.params.provider || '').toLowerCase();
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!provider) return res.status(400).json({ error: 'provider required' });
    const repo = AppDataSource.getRepository(IntegrationSettings);
    const item = await repo.findOne({ where: { userId, provider } });
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true, item });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get integration setting' });
  }
}

export async function upsertIntegrationSetting(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number;
    let provider = String(
      (req.body?.provider as string) || req.params.provider || ''
    ).toLowerCase();
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!provider) return res.status(400).json({ error: 'provider required' });

    const { config, credentials, enabled, preferences } = req.body || {};
    const repo = AppDataSource.getRepository(IntegrationSettings);

    const existing = await repo.findOne({ where: { userId, provider } });
    if (existing) {
      if (config !== undefined) existing.config = config;
      if (credentials !== undefined) existing.credentials = credentials;
      if (enabled !== undefined) existing.enabled = !!enabled;
      if (preferences !== undefined) existing.preferences = preferences;
      existing.updatedAt = new Date();
      await repo.save(existing);
      return res.json({ ok: true, item: existing, action: 'updated' });
    }

    const created = repo.create({
      userId,
      provider,
      config: config ?? {},
      credentials: credentials ?? {},
      enabled: enabled !== undefined ? !!enabled : true,
      preferences: preferences ?? {},
    } as any);
    await repo.save(created);
    res.status(201).json({ ok: true, item: created, action: 'created' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to upsert integration setting' });
  }
}

export async function deleteIntegrationSetting(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number;
    const provider = String(req.params.provider || '').toLowerCase();
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!provider) return res.status(400).json({ error: 'provider required' });
    const repo = AppDataSource.getRepository(IntegrationSettings);
    const result = await repo.delete({ userId, provider } as any);
    if (!result.affected) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true, message: 'deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete integration setting' });
  }
}
