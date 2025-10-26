import express from 'express';
import {
  inboundWebhook,
  slackSlashCommand,
  slackDigest,
  linkExternalTicket,
  syncStatus,
} from '../controllers/integrationsController.js';
import { strictLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Inbound webhooks (GitHub/Jira/Slack/custom)
router.post('/webhooks/:provider', strictLimiter, inboundWebhook);

// Slack-specific endpoints
router.post('/slack/commands', strictLimiter, slackSlashCommand);
router.post('/slack/digest', strictLimiter, slackDigest);

// Link tasks to external tickets and sync status
router.post('/links', strictLimiter, linkExternalTicket);
router.post('/status/sync', strictLimiter, syncStatus);

export default router;
