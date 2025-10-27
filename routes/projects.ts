import { Router } from 'express';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  recoverProject,
} from '../controllers/projectsController.js';
import { authenticate, requireVerified } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { strictLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get('/', requirePermission('project', 'read'), getProjects);
router.post('/', requirePermission('project', 'create'), createProject);
router.put('/:id', requirePermission('project', 'update'), updateProject);
router.delete('/:id', requirePermission('project', 'delete'), strictLimiter, deleteProject);
router.post('/:id/recover', requirePermission('project', 'update'), strictLimiter, recoverProject);

export default router;
