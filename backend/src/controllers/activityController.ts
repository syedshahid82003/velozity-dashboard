import { Response, NextFunction } from 'express';
import { activityService } from '../services/activityService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export const activityController = {
  async getFeed(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.query.projectId as string | undefined;
      const since = req.query.since as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const events = await activityService.getFeed(
        { userId: req.user!.id, role: req.user!.role },
        { projectId, since, limit }
      );
      sendSuccess(res, events);
    } catch (err) {
      next(err);
    }
  },

  async getMissedEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const since = req.query.since as string;
      if (!since) {
        sendSuccess(res, []);
        return;
      }

      const events = await activityService.getMissedEvents(
        { userId: req.user!.id, role: req.user!.role },
        since
      );
      sendSuccess(res, events);
    } catch (err) {
      next(err);
    }
  },
};
