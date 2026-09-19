import prisma from '../config/prisma';
import { Role, TaskStatus, TaskPriority } from '@prisma/client';
import { TaskFilterQuery } from '../types';

export interface RequesterContext {
  userId: string;
  role: Role;
}

export interface TaskInput {
  title: string;
  description?: string;
  projectId: string;
  assignedToId?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  assignedToId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export const taskService = {
  async listTasks(requester: RequesterContext, filters: TaskFilterQuery, projectId?: string) {
    const { userId, role } = requester;
    const { status, priority, dueDateFrom, dueDateTo, page = '1', limit = '20' } = filters;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build scope filter based on role
    const scopeWhere = role === 'ADMIN'
      ? {}
      : role === 'PROJECT_MANAGER'
      ? { project: { managerId: userId } }
      : { assignedToId: userId }; // DEVELOPER: only their tasks

    const where = {
      ...scopeWhere,
      ...(projectId ? { projectId } : {}),
      ...(status ? { status: status as TaskStatus } : {}),
      ...(priority ? { priority: priority as TaskPriority } : {}),
      ...(dueDateFrom || dueDateTo
        ? {
            dueDate: {
              ...(dueDateFrom ? { gte: new Date(dueDateFrom) } : {}),
              ...(dueDateTo ? { lte: new Date(dueDateTo) } : {}),
            },
          }
        : {}),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return { tasks, total, page: parseInt(page), limit: parseInt(limit) };
  },

  async getTask(id: string, requester: RequesterContext) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: {
          select: {
            id: true,
            name: true,
            managerId: true,
            manager: { select: { id: true, name: true } },
          },
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
    this._assertTaskAccess(task, requester);
    return task;
  },

  async createTask(data: TaskInput, requester: RequesterContext) {
    if (requester.role === 'DEVELOPER') {
      throw Object.assign(new Error('Developers cannot create tasks'), { statusCode: 403 });
    }

    // Verify PM owns the project
    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    if (requester.role === 'PROJECT_MANAGER' && project.managerId !== requester.userId) {
      throw Object.assign(new Error('You do not own this project'), { statusCode: 403 });
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        assignedToId: data.assignedToId,
        priority: data.priority ?? 'MEDIUM',
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, managerId: true } },
      },
    });

    // Log creation
    await prisma.activityLog.create({
      data: {
        projectId: data.projectId,
        taskId: task.id,
        userId: requester.userId,
        action: `created task "${task.title}"`,
        toStatus: task.status,
      },
    });

    // Notify assigned developer
    if (data.assignedToId) {
      await prisma.notification.create({
        data: {
          recipientId: data.assignedToId,
          taskId: task.id,
          type: 'TASK_ASSIGNED',
          message: `You were assigned to task "${task.title}"`,
        },
      });
    }

    return task;
  },

  async updateTask(
    id: string,
    data: TaskUpdateInput,
    requester: RequesterContext
  ): Promise<{ task: ReturnType<typeof prisma.task.findUnique> extends Promise<infer T> ? NonNullable<T> : never; activityLog: { id: string; action: string; projectId: string } }> {
    const existing = await prisma.task.findUnique({
      where: { id },
      include: { project: { select: { managerId: true } } },
    });

    if (!existing) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
    this._assertTaskAccess(existing, requester);

    // Developers can only update status
    if (requester.role === 'DEVELOPER') {
      const allowedKeys = ['status'];
      const attemptedKeys = Object.keys(data);
      const forbidden = attemptedKeys.filter((k) => !allowedKeys.includes(k));
      if (forbidden.length > 0) {
        throw Object.assign(
          new Error('Developers can only update task status'),
          { statusCode: 403 }
        );
      }
    }

    const previousStatus = existing.status;
    const newStatus = data.status;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.assignedToId !== undefined ? { assignedToId: data.assignedToId } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, managerId: true } },
      },
    });

    // Build activity log action text
    let action: string;
    let fromStatus: string | undefined;
    let toStatus: string | undefined;

    if (newStatus && newStatus !== previousStatus) {
      const from = previousStatus.replace('_', ' ');
      const to = newStatus.replace('_', ' ');
      action = `moved "${updatedTask.title}" from ${from} → ${to}`;
      fromStatus = previousStatus;
      toStatus = newStatus;
    } else {
      action = `updated task "${updatedTask.title}"`;
    }

    const activityLog = await prisma.activityLog.create({
      data: {
        projectId: updatedTask.project.id,
        taskId: id,
        userId: requester.userId,
        action,
        fromStatus,
        toStatus,
      },
    });

    // Notify PM when task moves to IN_REVIEW
    if (newStatus === 'IN_REVIEW' && newStatus !== previousStatus) {
      const pmId = updatedTask.project.managerId;
      if (pmId) {
        await prisma.notification.create({
          data: {
            recipientId: pmId,
            taskId: id,
            type: 'TASK_IN_REVIEW',
            message: `Task "${updatedTask.title}" is ready for review`,
          },
        });
      }
    }

    // Notify new developer when task is re-assigned
    if (data.assignedToId && data.assignedToId !== existing.assignedToId) {
      await prisma.notification.create({
        data: {
          recipientId: data.assignedToId,
          taskId: id,
          type: 'TASK_ASSIGNED',
          message: `You were assigned to task "${updatedTask.title}"`,
        },
      });
    }

    return { task: updatedTask as any, activityLog: { id: activityLog.id, action, projectId: activityLog.projectId } };
  },

  async deleteTask(id: string, requester: RequesterContext) {
    if (requester.role === 'DEVELOPER') {
      throw Object.assign(new Error('Developers cannot delete tasks'), { statusCode: 403 });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: { select: { managerId: true } } },
    });
    if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 });

    if (requester.role === 'PROJECT_MANAGER' && task.project.managerId !== requester.userId) {
      throw Object.assign(new Error('You do not own this project'), { statusCode: 403 });
    }

    await prisma.task.delete({ where: { id } });
  },

  _assertTaskAccess(
    task: { assignedToId: string | null; project: { managerId: string } },
    requester: RequesterContext
  ) {
    if (requester.role === 'ADMIN') return;
    if (requester.role === 'PROJECT_MANAGER') {
      if (task.project.managerId !== requester.userId) {
        throw Object.assign(new Error('Access denied'), { statusCode: 403 });
      }
      return;
    }
    // DEVELOPER: can only access tasks assigned to them
    if (task.assignedToId !== requester.userId) {
      throw Object.assign(new Error('You can only access your own tasks'), { statusCode: 403 });
    }
  },
};
