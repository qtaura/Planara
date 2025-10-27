import { Router } from 'express';
import { authenticate, requireVerified } from '../middlewares/auth.js';
import { requirePermission, requireOrgOwner, requireTeamRole } from '../middlewares/rbac.js';
import { strictLimiter } from '../middlewares/rateLimiter.js';
import { exportOrganization, exportTeam, exportProject } from '../controllers/exportController.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

// Export project data (owner or team members with read permission)
router.get('/project/:id', requirePermission('project', 'read'), strictLimiter, exportProject);

// Export team data (admins/owners)
router.get('/team/:id', requireTeamRole('admin'), strictLimiter, exportTeam);

// Export organization data (org owner)
router.get('/org/:id', requireOrgOwner(), strictLimiter, exportOrganization);

export default router;
