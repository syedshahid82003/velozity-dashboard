import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

/**
 * Role-based authorization middleware factory.
 * Usage: authorize('ADMIN', 'PROJECT_MANAGER')
 *
 * IMPORTANT: This is enforced at the API level.
 * Frontend role-hiding alone is NOT sufficient — this middleware
 * must be used on every protected route.
 */
export function authorize(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'You do not have permission to perform this action', 403);
      return;
    }

    next();
  };
}
