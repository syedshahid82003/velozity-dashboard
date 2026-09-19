import { Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { Role } from '@prisma/client';

export const userController = {
  async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const role = req.query.role as Role | undefined;
      const users = await userService.listUsers(role);
      sendSuccess(res, users);
    } catch (err) {
      next(err);
    }
  },

  async getUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.params.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  },

  async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      sendSuccess(res, user, 'User updated');
    } catch (err) {
      next(err);
    }
  },

  async deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await userService.deleteUser(req.params.id);
      sendSuccess(res, null, 'User deleted');
    } catch (err) {
      next(err);
    }
  },

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.user!.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  },

  async listDevelopers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const devs = await userService.listDevelopers();
      sendSuccess(res, devs);
    } catch (err) {
      next(err);
    }
  },
};
