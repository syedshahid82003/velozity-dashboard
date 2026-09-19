import { Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboardService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export const dashboardController = {
  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { role, id: userId } = req.user!;

      if (role === 'ADMIN') {
        const stats = await dashboardService.getAdminStats();
        sendSuccess(res, stats);
      } else if (role === 'PROJECT_MANAGER') {
        const stats = await dashboardService.getPMStats(userId);
        sendSuccess(res, stats);
      } else if (role === 'DEVELOPER') {
        const stats = await dashboardService.getDeveloperStats(userId);
        sendSuccess(res, stats);
      } else {
        sendError(res, 'Unknown role', 400);
      }
    } catch (err) {
      next(err);
    }
  },
};
