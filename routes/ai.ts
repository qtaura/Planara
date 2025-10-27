import { Router } from 'express';
import { authenticate, requireVerified } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import {
  authoringSuggest,
  authoringSummarizeThread,
  triage,
  analyticsTeam,
} from '../controllers/aiController.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

// Authoring
router.post('/authoring/suggest', authoringSuggest);
router.get(
  '/authoring/threads/:threadId/summary',
  requirePermission('comment', 'read'),
  authoringSummarizeThread
);

// Triage
router.post('/triage/evaluate', triage);

// Analytics
router.get('/analytics/team-insights', analyticsTeam);

export default router;
