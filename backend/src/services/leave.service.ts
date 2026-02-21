import { LeaveStatus, LeaveType } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../utils/audit';
import { eventBus, APP_EVENTS } from '../utils/event-bus';

interface CreateLeaveDto {
  leave_type: LeaveType;
  start_date: Date;
  end_date: Date;
  is_half_day?: boolean;
  half_day_period?: 'am' | 'pm';
  notes?: string;
}

interface ListLeavesParams {
  userId?: number;
  status?: LeaveStatus;
  page?: number;
  limit?: number;
}

export class LeaveService {
  async cancel(id: number, userId: number) {
    const leave = await prisma.leave.findUnique({ where: { id } });
    if (!leave) throw new NotFoundError('Leave not found');
    if (leave.user_id !== userId) throw new AppError('Bu izni iptal etme yetkiniz yok', 403);
    if (leave.status !== 'pending') throw new AppError('Sadece bekleyen talepler iptal edilebilir', 400);

    const updated = await prisma.leave.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    await createAuditLog({
      userId,
      action: 'leave_cancelled',
      resourceType: 'leave',
      resourceId: id,
      newValue: { status: 'cancelled_by_user' },
    });

    return updated;
  }

  async adminCreate(data: CreateLeaveDto & { user_id: number }, adminId: number) {
    const targetUserId = data.user_id;
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (end < start) throw new AppError('End date cannot be before start date', 400);

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundError('User not found');

    const overlapping = await prisma.leave.findFirst({
      where: {
        user_id: targetUserId,
        status: { in: ['pending', 'approved'] },
        start_date: { lte: end },
        end_date: { gte: start },
      },
    });
    if (overlapping) throw new AppError('Bu tarihlerde zaten bir izin kaydı bulunuyor', 409);

    const leave = await prisma.leave.create({
      data: {
        user_id: targetUserId,
        leave_type: data.leave_type,
        start_date: start,
        end_date: end,
        is_half_day: data.is_half_day ?? false,
        half_day_period: data.half_day_period ?? null,
        notes: data.notes,
        status: 'approved',
        approved_by_id: adminId,
      },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, email: true } },
      },
    });

    await createAuditLog({
      userId: adminId,
      action: 'leave_admin_created',
      resourceType: 'leave',
      resourceId: leave.id,
      newValue: { leave_type: data.leave_type, start_date: data.start_date, end_date: data.end_date, target_user_id: targetUserId },
    });

    return leave;
  }

  async adminCancel(id: number, adminId: number) {
    const leave = await prisma.leave.findUnique({ where: { id } });
    if (!leave) throw new NotFoundError('Leave not found');
    if (['cancelled', 'rejected'].includes(leave.status)) {
      throw new AppError('Bu izin zaten iptal/reddedilmiş', 400);
    }

    const updated = await prisma.leave.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    await createAuditLog({
      userId: adminId,
      action: 'leave_admin_cancelled',
      resourceType: 'leave',
      resourceId: id,
      newValue: { status: 'cancelled_by_admin' },
    });

    return updated;
  }

  async create(data: CreateLeaveDto, userId: number) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (end < start) throw new AppError('End date cannot be before start date', 400);

    const overlapping = await prisma.leave.findFirst({
      where: {
        user_id: userId,
        status: { in: ['pending', 'approved'] },
        start_date: { lte: end },
        end_date: { gte: start },
      },
    });
    if (overlapping) throw new AppError('Bu tarihlerde zaten bir izin talebiniz bulunuyor', 409);

    // Team capacity check: prevent more than 50% of active team from being on leave
    const [totalActiveUsers, overlappingLeaves] = await Promise.all([
      prisma.user.count({ where: { is_active: true, role: { notIn: ['super_admin'] } } }),
      prisma.leave.count({
        where: {
          user_id: { not: userId },
          status: { in: ['approved'] },
          start_date: { lte: end },
          end_date: { gte: start },
        },
      }),
    ]);

    const maxConcurrentLeaves = Math.max(1, Math.floor(totalActiveUsers * 0.5));
    if (overlappingLeaves >= maxConcurrentLeaves) {
      throw new AppError(
        `Bu tarihlerde zaten ${overlappingLeaves} kişi izinli. Takım kapasitesi nedeniyle izin talebi oluşturulamıyor.`,
        409
      );
    }

    const leave = await prisma.leave.create({
      data: {
        user_id: userId,
        leave_type: data.leave_type,
        start_date: start,
        end_date: end,
        is_half_day: data.is_half_day ?? false,
        half_day_period: data.half_day_period ?? null,
        notes: data.notes,
        status: 'pending',
      },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, email: true } },
      },
    });

    await createAuditLog({
      userId,
      action: 'leave_requested',
      resourceType: 'leave',
      resourceId: leave.id,
      newValue: { leave_type: data.leave_type, start_date: data.start_date, end_date: data.end_date },
    });

    eventBus.emitEvent(APP_EVENTS.LEAVE_CREATED, {
      userId,
      userName: `${leave.user.first_name} ${leave.user.last_name}`,
      startDate: start.toLocaleDateString('tr-TR'),
      endDate: end.toLocaleDateString('tr-TR'),
      leaveType: data.leave_type,
    });

    return leave;
  }

  async list(params: ListLeavesParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.userId) where.user_id = params.userId;
    if (params.status) where.status = params.status;

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, role: true } },
          approved_by: { select: { id: true, first_name: true, last_name: true } },
        },
      }),
      prisma.leave.count({ where }),
    ]);

    return {
      data: leaves,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: number) {
    const leave = await prisma.leave.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, first_name: true, last_name: true } },
        approved_by: { select: { id: true, first_name: true, last_name: true } },
      },
    });
    if (!leave) throw new NotFoundError('Leave not found');
    return leave;
  }

  async approve(id: number, approverId: number) {
    const leave = await prisma.leave.findUnique({ where: { id } });
    if (!leave) throw new NotFoundError('Leave not found');
    if (leave.status !== 'pending') throw new AppError('Leave is not in pending status', 400);

    const updated = await prisma.leave.update({
      where: { id },
      data: { status: 'approved', approved_by_id: approverId },
      include: {
        user: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    await createAuditLog({
      userId: approverId,
      action: 'leave_approved',
      resourceType: 'leave',
      resourceId: id,
      newValue: { status: 'approved' },
    });

    eventBus.emitEvent(APP_EVENTS.LEAVE_STATUS_CHANGED, {
      leaveUserId: leave.user_id,
      status: 'approved',
      startDate: leave.start_date.toLocaleDateString('tr-TR'),
      endDate: leave.end_date.toLocaleDateString('tr-TR'),
    });

    return updated;
  }

  async reject(id: number, approverId: number, reason?: string) {
    const leave = await prisma.leave.findUnique({ where: { id } });
    if (!leave) throw new NotFoundError('Leave not found');
    if (leave.status !== 'pending') throw new AppError('Leave is not in pending status', 400);

    const updated = await prisma.leave.update({
      where: { id },
      data: {
        status: 'rejected',
        approved_by_id: approverId,
        rejection_reason: reason ?? null,
      } as never,
    });

    await createAuditLog({
      userId: approverId,
      action: 'leave_rejected',
      resourceType: 'leave',
      resourceId: id,
      newValue: { status: 'rejected', reason },
    });

    eventBus.emitEvent(APP_EVENTS.LEAVE_STATUS_CHANGED, {
      leaveUserId: leave.user_id,
      status: 'rejected',
      startDate: leave.start_date.toLocaleDateString('tr-TR'),
      endDate: leave.end_date.toLocaleDateString('tr-TR'),
    });

    return updated;
  }

  async delete(id: number, adminId: number) {
    const leave = await prisma.leave.findUnique({ where: { id } });
    if (!leave) throw new NotFoundError('Leave not found');

    await prisma.leave.delete({ where: { id } });

    await createAuditLog({
      userId: adminId,
      action: 'leave_deleted',
      resourceType: 'leave',
      resourceId: id,
      newValue: { deleted: true },
    });

    return { id };
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, approvedThisMonth, onLeaveToday] = await Promise.all([
      prisma.leave.count({ where: { status: 'pending' } }),
      prisma.leave.count({
        where: {
          status: 'approved',
          created_at: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
      }),
      prisma.leave.count({
        where: {
          status: 'approved',
          start_date: { lte: today },
          end_date: { gte: today },
        },
      }),
    ]);

    return { pending, approvedThisMonth, onLeaveToday };
  }

  async getBalance(userId: number) {
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const ANNUAL_ALLOWANCE = 14;

    const approvedLeaves = await prisma.leave.findMany({
      where: {
        user_id: userId,
        status: 'approved',
        leave_type: 'annual',
        start_date: { gte: yearStart, lte: yearEnd },
      },
    });

    const countBusinessDays = (start: Date, end: Date): number => {
      let count = 0;
      const cur = new Date(start);
      while (cur <= end) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return count;
    };

    const usedDays = approvedLeaves.reduce((sum, leave) => {
      if (leave.is_half_day) return sum + 0.5;
      return sum + countBusinessDays(leave.start_date, leave.end_date);
    }, 0);

    const pendingLeaves = await prisma.leave.findMany({
      where: {
        user_id: userId,
        status: 'pending',
        leave_type: 'annual',
        start_date: { gte: yearStart, lte: yearEnd },
      },
    });

    const pendingDays = pendingLeaves.reduce((sum, leave) => {
      if (leave.is_half_day) return sum + 0.5;
      return sum + countBusinessDays(leave.start_date, leave.end_date);
    }, 0);

    return {
      year,
      annual_allowance: ANNUAL_ALLOWANCE,
      used_days: usedDays,
      pending_days: pendingDays,
      remaining_days: ANNUAL_ALLOWANCE - usedDays,
    };
  }

  async getTeamCalendar(month?: number, year?: number) {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month !== undefined ? month : now.getMonth();
    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0);

    const leaves = await prisma.leave.findMany({
      where: {
        status: 'approved',
        start_date: { lte: end },
        end_date: { gte: start },
      },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, role: true, avatar_url: true } },
      },
      orderBy: { start_date: 'asc' },
    });

    return leaves.map((l) => ({
      id: l.id,
      user: l.user,
      leave_type: l.leave_type,
      start_date: l.start_date,
      end_date: l.end_date,
      is_half_day: l.is_half_day,
      half_day_period: l.half_day_period,
    }));
  }
}

export const leaveService = new LeaveService();
