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
} from '../controllers/retentionController.js';

const router = Router();

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
router.post('/admin/policies', strictLimiter, adminOnly, validateBody(CreateSchema), createPolicy);

const UpdateSchema = z.object({
  maxVersions: z.number().int().min(1).optional(),
  keepDays: z.number().int().min(1).optional(),
});
router.put(
  '/admin/policies/:id',
  strictLimiter,
  adminOnly,
  validateBody(UpdateSchema),
  updatePolicy
);
router.delete('/admin/policies/:id', strictLimiter, adminOnly, deletePolicy);

export default router;
