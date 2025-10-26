import { Request, Response } from 'express';
import { verifySignature, WebhookProvider } from '../services/webhookService.js';
import { strictLimiter } from '../middlewares/rateLimiter.js';

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
  const { taskId, provider, externalId, url } = req.body || {};
  if (!taskId || !provider || !externalId || !url) {
    return res.status(400).json({ error: 'taskId, provider, externalId, url required' });
  }
  // Stub: persist the linkage (DB entity/model to be added later)
  res.json({ ok: true, taskId, provider, externalId, url });
}

export async function syncStatus(req: Request, res: Response) {
  const { taskId, provider } = req.body || {};
  if (!taskId || !provider) {
    return res.status(400).json({ error: 'taskId and provider required' });
  }
  // Stub: fetch external status and sync with internal task
  res.json({ ok: true, taskId, provider, status: 'synced' });
}
