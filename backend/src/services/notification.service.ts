import prisma from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

interface ListNotificationsParams {
  userId: number;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export class NotificationService {
  async list(params: ListNotificationsParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { user_id: params.userId };
    if (params.unreadOnly) where.is_read = false;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          project: { select: { id: true, nj_number: true, title: true } },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUnreadCount(userId: number) {
    const count = await prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });
    return { count };
  }

  async markRead(id: number, userId: number) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundError('Notification not found');
    if (notification.user_id !== userId) throw new NotFoundError('Notification not found');

    return prisma.notification.update({
      where: { id },
      data: { is_read: true, read_at: new Date() },
    });
  }

  async markAllRead(userId: number) {
    const result = await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    return { updated: result.count };
  }

  async create(data: {
    userId: number;
    projectId?: number;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
  }) {
    return prisma.notification.create({
      data: {
        user_id: data.userId,
        project_id: data.projectId,
        type: data.type,
        title: data.title,
        message: data.message,
        action_url: data.actionUrl,
      },
    });
  }
}

export const notificationService = new NotificationService();
