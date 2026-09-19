import prisma from '../config/prisma';
import { Role } from '@prisma/client';

export interface RequesterContext {
  userId: string;
  role: Role;
}

export const activityService = {
  /**
   * Returns activity feed scoped by role:
   * - ADMIN: all activity across all projects
   * - PM: activity from their projects only
   * - DEVELOPER: activity on tasks assigned to them only
   *
   * If a `since` timestamp is provided, only returns events after that time
   * (used for "missed events" catchup when user comes back online).
   */
  async getFeed(
    requester: RequesterContext,
    options: { projectId?: string; since?: string; limit?: number }
  ) {
    const { userId, role } = requester;
    const { projectId, since, limit = 20 } = options;

    const scopeWhere =
      role === 'ADMIN'
        ? {}
        : role === 'PROJECT_MANAGER'
        ? { project: { managerId: userId } }
        : { task: { assignedToId: userId } };

    const where = {
      ...scopeWhere,
      ...(projectId ? { projectId } : {}),
      ...(since ? { createdAt: { gt: new Date(since) } } : {}),
    };

    return prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
    });
  },

  /**
   * Returns the last N missed events since a given timestamp.
   * Used when a user reconnects after being offline.
   */
  async getMissedEvents(requester: RequesterContext, since: string) {
    return this.getFeed(requester, { since, limit: 20 });
  },
};
