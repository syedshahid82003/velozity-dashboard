import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authenticate } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

// GET /api/notifications?unread=true
router.get('/', notificationController.getNotifications);

// GET /api/notifications/unread-count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', notificationController.markAsRead);

// PATCH /api/notifications/mark-all-read
router.patch('/mark-all-read', notificationController.markAllAsRead);

// DELETE /api/notifications/:id
router.delete('/:id', notificationController.deleteNotification);

export default router;
