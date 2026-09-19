import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notificationService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export const notificationController = {
  async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const unreadOnly = req.query.unread === 'true';
      const notifications = await notificationService.getNotifications(req.user!.id, unreadOnly);
      sendSuccess(res, notifications);
    } catch (err) {
      next(err);
    }
  },

  async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.getUnreadCount(req.user!.id);
      sendSuccess(res, { count });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const notification = await notificationService.markAsRead(req.params.id, req.user!.id);
      sendSuccess(res, notification, 'Marked as read');
    } catch (err) {
      next(err);
    }
  },

  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllAsRead(req.user!.id);
      sendSuccess(res, null, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  },

  async deleteNotification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.deleteNotification(req.params.id, req.user!.id, req.user!.role);
      sendSuccess(res, null, 'Notification deleted');
    } catch (err) {
      next(err);
    }
  },
};
