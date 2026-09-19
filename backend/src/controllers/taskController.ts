import { Response, NextFunction } from 'express';
import { taskService } from '../services/taskService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest, TaskFilterQuery } from '../types';
import { getSocketInstance } from '../socket';

export const taskController = {
  async listTasks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters: TaskFilterQuery = {
        status: req.query.status as string,
        priority: req.query.priority as string,
        dueDateFrom: req.query.dueDateFrom as string,
        dueDateTo: req.query.dueDateTo as string,
        page: req.query.page as string,
        limit: req.query.limit as string,
      };
      const projectId = req.query.projectId as string | undefined;

      const result = await taskService.listTasks(
        { userId: req.user!.id, role: req.user!.role },
        filters,
        projectId
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const task = await taskService.getTask(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });
      sendSuccess(res, task);
    } catch (err) {
      next(err);
    }
  },

  async createTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const task = await taskService.createTask(req.body, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      // Emit real-time event to the project room
      const io = getSocketInstance();
      if (io) {
        io.to(`project:${(task as any).project.id}`).emit('task:created', { task });

        // Notify assigned developer in real time
        if ((task as any).assignedToId) {
          io.to(`user:${(task as any).assignedToId}`).emit('notification:new');
        }
      }

      sendSuccess(res, task, 'Task created', 201);
    } catch (err) {
      next(err);
    }
  },

  async updateTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { task, activityLog } = await taskService.updateTask(req.params.id, req.body, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      // Emit real-time update to project room
      const io = getSocketInstance();
      if (io) {
        const projectId = (task as any).project.id;

        // Full activity event for the feed
        const activityEvent = {
          id: activityLog.id,
          action: activityLog.action,
          projectId,
          task: { id: (task as any).id, title: (task as any).title },
          user: { id: req.user!.id, name: req.user!.name },
          createdAt: new Date().toISOString(),
        };

        io.to(`project:${projectId}`).emit('task:updated', { task, activityEvent });
        io.to(`project:${projectId}`).emit('activity:new', activityEvent);

        // Broadcast to admin global feed
        io.to('admin:global').emit('activity:new', activityEvent);

        // Notify assigned developer in real time
        if ((task as any).assignedToId) {
          io.to(`user:${(task as any).assignedToId}`).emit('activity:new', activityEvent);
          io.to(`user:${(task as any).assignedToId}`).emit('notification:new');
        }

        // Notify PM when task moves to IN_REVIEW
        if (req.body.status === 'IN_REVIEW') {
          const managerId = (task as any).project?.managerId;
          if (managerId) {
            io.to(`user:${managerId}`).emit('notification:new');
          }
        }
      }

      sendSuccess(res, task, 'Task updated');
    } catch (err) {
      next(err);
    }
  },

  async deleteTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await taskService.deleteTask(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      sendSuccess(res, null, 'Task deleted');
    } catch (err) {
      next(err);
    }
  },
};
