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
  listIntegrationSettings,
  getIntegrationSetting,
  upsertIntegrationSetting,
  deleteIntegrationSetting,
} from '../controllers/integrationsController.js';
import { strictLimiter } from '../middlewares/rateLimiter.js';
import { rawBodyCapture } from '../middlewares/rawBody.js';
import { authenticate, requireVerified } from '../middlewares/auth.js';

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
router.post(
  '/calendar/import',
  authenticate,
  requireVerified,
  rawBodyCapture,
  strictLimiter,
  importCalendar
);

// Integration settings (CRUD) — authenticated
router.get('/settings', authenticate, requireVerified, listIntegrationSettings);
router.get('/settings/:provider', authenticate, requireVerified, getIntegrationSetting);
router.post('/settings', authenticate, requireVerified, strictLimiter, upsertIntegrationSetting);
router.put(
  '/settings/:provider',
  authenticate,
  requireVerified,
  strictLimiter,
  upsertIntegrationSetting
);
router.delete(
  '/settings/:provider',
  authenticate,
  requireVerified,
  strictLimiter,
  deleteIntegrationSetting
);

export default router;
