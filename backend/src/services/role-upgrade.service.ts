import prisma from '../utils/prisma';
import { AppError, NotFoundError } from '../utils/errors';

export class RoleUpgradeService {
  async create(userId: number, reason?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    if (!['designer', 'senior_designer'].includes(user.role)) {
      throw new AppError('Only designers can request a role upgrade', 400);
    }
    const toRole = user.role === 'designer' ? 'senior_designer' : 'admin';

    const existing = await prisma.roleUpgradeRequest.findFirst({
      where: { user_id: userId, status: 'pending' },
    });
    if (existing) throw new AppError('You already have a pending upgrade request', 409);

    return prisma.roleUpgradeRequest.create({
      data: { user_id: userId, from_role: user.role, to_role: toRole as never, reason },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, role: true, email: true } },
      },
    });
  }

  async list(status?: string) {
    return prisma.roleUpgradeRequest.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        user: { select: { id: true, first_name: true, last_name: true, role: true, email: true } },
        reviewer: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async listByUser(userId: number) {
    return prisma.roleUpgradeRequest.findMany({
      where: { user_id: userId },
      include: {
        reviewer: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async approve(id: number, reviewerId: number, note?: string) {
    const req = await prisma.roleUpgradeRequest.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!req) throw new NotFoundError('Request not found');
    if (req.status !== 'pending') throw new AppError('Request is not pending', 400);

    const [updated] = await prisma.$transaction([
      prisma.roleUpgradeRequest.update({
        where: { id },
        data: { status: 'approved', reviewed_by: reviewerId, review_note: note, reviewed_at: new Date() },
      }),
      prisma.user.update({
        where: { id: req.user_id },
        data: { role: req.to_role },
      }),
      prisma.notification.create({
        data: {
          user_id: req.user_id,
          type: 'system_alert',
          title: 'Rol Yükseltme Onaylandı',
          message: `Tebrikler! Rol yükseltme talebiniz onaylandı. Yeni rolünüz: ${req.to_role.replace('_', ' ')}.`,
          action_url: '/profile',
        },
      }),
    ]);

    return updated;
  }

  async reject(id: number, reviewerId: number, note?: string) {
    const req = await prisma.roleUpgradeRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundError('Request not found');
    if (req.status !== 'pending') throw new AppError('Request is not pending', 400);

    const updated = await prisma.roleUpgradeRequest.update({
      where: { id },
      data: { status: 'rejected', reviewed_by: reviewerId, review_note: note, reviewed_at: new Date() },
    });

    await prisma.notification.create({
      data: {
        user_id: req.user_id,
        type: 'system_alert',
        title: 'Rol Yükseltme Reddedildi',
        message: `Rol yükseltme talebiniz reddedildi.${note ? ` Not: ${note}` : ''}`,
        action_url: '/profile',
      },
    });

    return updated;
  }
}

export const roleUpgradeService = new RoleUpgradeService();
