import { Router } from 'express';
import {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from '../controllers/milestonesController.js';
import { authenticate, requireVerified } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get('/', requirePermission('project', 'read'), getMilestones);
router.post('/', requirePermission('project', 'update'), createMilestone);
router.put('/:id', requirePermission('project', 'update'), updateMilestone);
router.delete('/:id', requirePermission('project', 'delete'), deleteMilestone);

export default router;
