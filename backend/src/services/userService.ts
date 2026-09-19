import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { Role } from '@prisma/client';

export const userService = {
  // Admin: list all users, optionally filtered by role
  async listUsers(role?: Role) {
    return prisma.user.findMany({
      where: role ? { role } : undefined,
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    return user;
  },

  async updateUser(id: string, data: { name?: string; email?: string; password?: string; role?: Role }) {
    const updates: Record<string, unknown> = {};
    if (data.name) updates.name = data.name;
    if (data.email) updates.email = data.email;
    if (data.role) updates.role = data.role;
    if (data.password) {
      updates.passwordHash = await bcrypt.hash(data.password, 12);
    }

    return prisma.user.update({
      where: { id },
      data: updates,
      select: { id: true, email: true, name: true, role: true, updatedAt: true },
    });
  },

  async deleteUser(id: string) {
    await prisma.user.delete({ where: { id } });
  },

  // Developers only — used for task assignment dropdown
  async listDevelopers() {
    return prisma.user.findMany({
      where: { role: 'DEVELOPER' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  },
};
