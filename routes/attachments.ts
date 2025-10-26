import { Router } from 'express';
import { authenticate, requireVerified } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import {
  uploadAttachment,
  getAttachments,
  getPreview,
  deleteAttachment,
  listVersions,
  rollbackVersion,
} from '../controllers/attachmentsController.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get('/', requirePermission('file', 'read'), getAttachments);
router.post('/upload', requirePermission('file', 'create'), uploadAttachment);
router.get('/:id/preview', requirePermission('file', 'read'), getPreview);
router.delete('/:id', requirePermission('file', 'delete'), deleteAttachment);
router.get('/:id/versions', requirePermission('file', 'read'), listVersions);
router.post('/:id/rollback', requirePermission('file', 'update'), rollbackVersion);

export default router;
