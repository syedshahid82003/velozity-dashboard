import prisma from '../config/prisma';
import { Role } from '@prisma/client';

export interface ProjectInput {
  name: string;
  description?: string;
  clientId: string;
  managerId?: string;
}

export interface RequesterContext {
  userId: string;
  role: Role;
}

export const projectService = {
  /**
   * Returns projects visible to the requester:
   * - ADMIN: all projects
   * - PROJECT_MANAGER: only projects they manage
   * - DEVELOPER: projects that contain tasks assigned to them
   */
  async listProjects(requester: RequesterContext) {
    const { userId, role } = requester;

    if (role === 'ADMIN') {
      return prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, company: true } },
          manager: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: true } },
        },
      });
    }

    if (role === 'PROJECT_MANAGER') {
      return prisma.project.findMany({
        where: { managerId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, company: true } },
          manager: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: true } },
        },
      });
    }

    // DEVELOPER — projects where they have at least one assigned task
    return prisma.project.findMany({
      where: { tasks: { some: { assignedToId: userId } } },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, company: true } },
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true } },
      },
    });
  },

  async getProject(id: string, requester: RequesterContext) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        manager: { select: { id: true, name: true, email: true } },
        tasks: {
          include: { assignedTo: { select: { id: true, name: true, email: true } } },
          orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        },
      },
    });

    if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    this._assertAccess(project, requester);
    return project;
  },

  async createProject(data: ProjectInput, requester: RequesterContext) {
    if (requester.role === 'DEVELOPER') {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }

    // Admin can specify a manager; PM always becomes manager of their own project
    const managerId =
      requester.role === 'ADMIN' && data.managerId
        ? data.managerId
        : requester.userId;

    return prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        clientId: data.clientId,
        managerId,
      },
      include: {
        client: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
  },

  async updateProject(id: string, data: Partial<ProjectInput>, requester: RequesterContext) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    this._assertAccess(project, requester);

    return prisma.project.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
  },

  async deleteProject(id: string, requester: RequesterContext) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    this._assertAccess(project, requester);
    await prisma.project.delete({ where: { id } });
  },

  /**
   * Scoped access check:
   * - ADMIN: always allowed
   * - PROJECT_MANAGER: only their own projects
   * - DEVELOPER: read-only enforced at route level; checked separately in task routes
   */
  _assertAccess(project: { managerId: string }, requester: RequesterContext) {
    if (requester.role === 'ADMIN') return;
    if (requester.role === 'PROJECT_MANAGER' && project.managerId !== requester.userId) {
      throw Object.assign(new Error('You do not have access to this project'), { statusCode: 403 });
    }
    if (requester.role === 'DEVELOPER') {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }
  },
};
