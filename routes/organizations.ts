import { Router } from 'express';
import { authenticate, requireVerified } from '../middlewares/auth.js';
import { requireOrgOwner } from '../middlewares/rbac.js';
import { strictLimiter } from '../middlewares/rateLimiter.js';
import {
  createOrganization,
  listMyOrganizations,
  updateOrganization,
  deleteOrganization,
  transferOrgOwnership,
  recoverOrganization,
} from '../controllers/organizationsController.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get('/', listMyOrganizations);
router.post('/', strictLimiter, createOrganization);
router.put('/:id', requireOrgOwner(), strictLimiter, updateOrganization);
router.delete('/:id', requireOrgOwner(), strictLimiter, deleteOrganization);
router.post('/:id/recover', requireOrgOwner(), strictLimiter, recoverOrganization);
router.post('/:id/transfer-ownership', requireOrgOwner(), strictLimiter, transferOrgOwnership);

export default router;
