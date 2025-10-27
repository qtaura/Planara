import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { strictLimiter } from '../middlewares/rateLimiter.js';
import { adminOnly } from '../middlewares/admin.js';
import { validateBody } from '../middlewares/validation.js';
import { z } from 'zod';
import {
  listPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  runBatch,
} from '../controllers/retentionController.js';

const router = Router();

// Disable strict limiter in test to avoid flakiness from shared test server
const maybeStrict =
  process.env.NODE_ENV === 'test' ? (_req: any, _res: any, next: any) => next() : strictLimiter;

router.use(authenticate);

// Admin-only policy management
router.get('/admin/policies', adminOnly, listPolicies);

const CreateSchema = z.object({
  scope: z.enum(['global', 'team', 'project']),
  teamId: z.number().optional(),
  projectId: z.number().optional(),
  maxVersions: z.number().int().min(1).optional(),
  keepDays: z.number().int().min(1).optional(),
});
router.post(
  '/admin/policies',
  maybeStrict as any,
  adminOnly,
  validateBody(CreateSchema),
  createPolicy
);

const UpdateSchema = z.object({
  maxVersions: z.number().int().min(1).optional(),
  keepDays: z.number().int().min(1).optional(),
});
router.put(
  '/admin/policies/:id',
  maybeStrict as any,
  adminOnly,
  validateBody(UpdateSchema),
  updatePolicy
);
router.delete('/admin/policies/:id', maybeStrict as any, adminOnly, deletePolicy);

// Manual batch trigger for ops (admin-only)
router.post('/admin/run-batch', maybeStrict as any, adminOnly, runBatch as any);

export default router;
