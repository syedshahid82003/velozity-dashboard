import prisma from '../config/prisma';
import { Role } from '@prisma/client';
import { getOnlineUserCount } from '../socket';

export interface RequesterContext {
  userId: string;
  role: Role;
}

export const dashboardService = {
  async getAdminStats() {
    const [
      totalProjects,
      totalClients,
      tasksByStatus,
      overdueCount,
      onlineCount,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.client.count(),
      prisma.task.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.task.count({ where: { status: 'OVERDUE' } }),
      Promise.resolve(getOnlineUserCount()),
    ]);

    return {
      totalProjects,
      totalClients,
      tasksByStatus: tasksByStatus.map((s) => ({ status: s.status, count: s._count._all })),
      overdueCount,
      onlineUsers: onlineCount,
    };
  },

  async getPMStats(userId: string) {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const projects = await prisma.project.findMany({
      where: { managerId: userId },
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          select: { status: true, priority: true, dueDate: true },
        },
      },
    });

    const tasksByPriority = await prisma.task.groupBy({
      by: ['priority'],
      where: { project: { managerId: userId } },
      _count: { _all: true },
    });

    const upcomingTasks = await prisma.task.findMany({
      where: {
        project: { managerId: userId },
        dueDate: { gte: now, lte: weekFromNow },
        status: { not: 'DONE' },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
      include: {
        assignedTo: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return {
      totalProjects: projects.length,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        taskCount: p._count.tasks,
        statusBreakdown: p.tasks.reduce(
          (acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      })),
      tasksByPriority: tasksByPriority.map((t) => ({ priority: t.priority, count: t._count._all })),
      upcomingTasks,
    };
  },

  async getDeveloperStats(userId: string) {
    const tasks = await prisma.task.findMany({
      where: { assignedToId: userId, status: { not: 'DONE' } },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    const completedCount = await prisma.task.count({
      where: { assignedToId: userId, status: 'DONE' },
    });

    const overdueCount = await prisma.task.count({
      where: { assignedToId: userId, status: 'OVERDUE' },
    });

    return {
      activeTasks: tasks,
      completedCount,
      overdueCount,
      totalAssigned: tasks.length + completedCount,
    };
  },
};
