import { Router } from 'express';
import { authenticate, requireVerified } from '../middlewares/auth.js';
import { requireTeamRole } from '../middlewares/rbac.js';
import { strictLimiter } from '../middlewares/rateLimiter.js';
import {
  createTeam,
  listTeams,
  listMembers,
  changeRole,
  transferTeamOwnership,
  leaveTeam,
} from '../controllers/teamsController.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

// Create/list teams within an organization
router.post('/:orgId', createTeam);
router.get('/:orgId', listTeams);

// Members management
router.get('/members/:teamId', requireTeamRole('member'), listMembers);
router.post('/members/:teamId/change-role', requireTeamRole('admin'), strictLimiter, changeRole);
router.post(
  '/members/:teamId/transfer-ownership',
  requireTeamRole('owner'),
  strictLimiter,
  transferTeamOwnership
);
router.post('/members/:teamId/leave', requireTeamRole('member'), leaveTeam);

export default router;