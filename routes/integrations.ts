import express from 'express';
import {
  inboundWebhook,
  slackSlashCommand,
  slackDigest,
  linkExternalTicket,
  syncStatus,
  getExternalLinks,
  deleteExternalLink,
  exportCalendar,
  importCalendar,
} from '../controllers/integrationsController.js';
import { strictLimiter } from '../middlewares/rateLimiter.js';
import { rawBodyCapture } from '../middlewares/rawBody.js';

const router = express.Router();

// Inbound webhooks (GitHub/Jira/Slack/custom) with raw body capture for strict HMAC
router.post('/webhooks/:provider', rawBodyCapture, strictLimiter, inboundWebhook);

// Slack-specific endpoints
router.post('/slack/commands', rawBodyCapture, strictLimiter, slackSlashCommand);
router.post('/slack/digest', rawBodyCapture, strictLimiter, slackDigest);

// Link tasks to external tickets and sync status
router.post('/links', strictLimiter, linkExternalTicket);
router.post('/status/sync', strictLimiter, syncStatus);

// External link management
router.get('/links/:taskId', getExternalLinks);
router.delete('/links/:linkId', strictLimiter, deleteExternalLink);

// Calendar export/import
router.get('/calendar/export', exportCalendar);
router.post('/calendar/import', rawBodyCapture, strictLimiter, importCalendar);

export default router;
