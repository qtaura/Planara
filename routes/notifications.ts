import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationsController.js';
import { authenticate, requireVerified } from '../middlewares/auth.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);
router.use(requireVerified);

// GET /api/notifications - Get all notifications for the user
router.get('/', getNotifications);

// GET /api/notifications/unread-count - Get count of unread notifications
router.get('/unread-count', getUnreadCount);

// POST /api/notifications - Create a new notification
router.post('/', createNotification);

// PUT /api/notifications/:id/read - Mark a notification as read
router.put('/:id/read', markAsRead);

// PUT /api/notifications/:id/unread - Mark a notification as unread
router.put('/:id/unread', markAsUnread);

// PUT /api/notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', markAllAsRead);

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', deleteNotification);

export default router;