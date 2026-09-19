import { Response, NextFunction } from 'express';
import { projectService } from '../services/projectService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export const projectController = {
  async listProjects(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const projects = await projectService.listProjects({
        userId: req.user!.id,
        role: req.user!.role,
      });
      sendSuccess(res, projects);
    } catch (err) {
      next(err);
    }
  },

  async getProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getProject(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });
      sendSuccess(res, project);
    } catch (err) {
      next(err);
    }
  },

  async createProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const project = await projectService.createProject(req.body, {
        userId: req.user!.id,
        role: req.user!.role,
      });
      sendSuccess(res, project, 'Project created', 201);
    } catch (err) {
      next(err);
    }
  },

  async updateProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const project = await projectService.updateProject(req.params.id, req.body, {
        userId: req.user!.id,
        role: req.user!.role,
      });
      sendSuccess(res, project, 'Project updated');
    } catch (err) {
      next(err);
    }
  },

  async deleteProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await projectService.deleteProject(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });
      sendSuccess(res, null, 'Project deleted');
    } catch (err) {
      next(err);
    }
  },
};
