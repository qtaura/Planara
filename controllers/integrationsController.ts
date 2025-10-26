import { Request, Response } from 'express';
import { verifySignature, WebhookProvider } from '../services/webhookService.js';
import { strictLimiter } from '../middlewares/rateLimiter.js';
import { AppDataSource } from '../db/data-source.js';
import { ExternalLink } from '../models/ExternalLink.js';
import { Task } from '../models/Task.js';

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
  // Stub: ICS import would parse uploaded .ics file and create tasks
  // This is a complex operation requiring ICS parsing library
  res.json({
    ok: true,
    message: 'Calendar import is stubbed - would parse ICS and create tasks',
    note: 'Implement with node-ical or similar library',
  });
}
