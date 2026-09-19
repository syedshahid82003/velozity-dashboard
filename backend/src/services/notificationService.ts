import prisma from '../config/prisma';
import { Role } from '@prisma/client';

export const notificationService = {
  async getNotifications(userId: string, unreadOnly = false) {
    return prisma.notification.findMany({
      where: {
        recipientId: userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        task: { select: { id: true, title: true, project: { select: { id: true, name: true } } } },
      },
    });
  },

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { recipientId: userId, read: false },
    });
  },

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
    if (notification.recipientId !== userId) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }
    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  },

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { recipientId: userId, read: false },
      data: { read: true },
    });
  },

  async deleteNotification(notificationId: string, userId: string, role: Role) {
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
    if (role !== 'ADMIN' && notification.recipientId !== userId) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }
    await prisma.notification.delete({ where: { id: notificationId } });
  },
};
