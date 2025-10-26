import { Router } from 'express';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/tasksController.js';
import { authenticate, requireVerified } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get('/', requirePermission('task', 'read'), getTasks);
router.post('/', requirePermission('task', 'create'), createTask);
router.put('/:id', requirePermission('task', 'update'), updateTask);
router.delete('/:id', requirePermission('task', 'delete'), deleteTask);

export default router;
