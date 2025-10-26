import { Router } from 'express';
import { authenticate, requireVerified } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { getComments, createComment, deleteComment } from '../controllers/commentsController.js';
import { createReply, getThread, reactToComment } from '../controllers/commentThreadsController.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get('/', requirePermission('comment', 'read'), getComments);
router.post('/', requirePermission('comment', 'create'), createComment);
router.delete('/:id', requirePermission('comment', 'delete'), deleteComment);

router.post('/:id/replies', requirePermission('comment', 'create'), createReply);
router.get('/threads/:threadId', requirePermission('comment', 'read'), getThread);
router.post('/:id/reactions', requirePermission('comment', 'update'), reactToComment);

export default router;