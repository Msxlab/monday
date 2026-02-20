import { LogType } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError, NotFoundError } from '../utils/errors';

interface CreateDailyLogDto {
  project_id?: number;
  log_type: LogType;
  content?: string;
  log_date?: Date;
}

interface ListDailyLogsParams {
  userId?: number;
  projectId?: number;
  logType?: LogType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class DailyLogService {
  async create(data: CreateDailyLogDto, userId: number) {
    if (data.project_id) {
      const project = await prisma.project.findUnique({ where: { id: data.project_id } });
      if (!project) throw new NotFoundError('Project not found');
    }

    if (data.log_type === 'checkin') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existing = await prisma.dailyLog.findFirst({
        where: {
          user_id: userId,
          log_type: 'checkin',
          log_date: { gte: today },
        },
      });
      if (existing) throw new AppError('Already checked in today', 409);
    }

    return prisma.dailyLog.create({
      data: {
        user_id: userId,
        project_id: data.project_id,
        log_type: data.log_type,
        content: data.content,
        log_date: data.log_date || new Date(),
      },
      include: {
        project: { select: { id: true, nj_number: true, title: true } },
      },
    });
  }

  async list(params: ListDailyLogsParams) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.userId) where.user_id = params.userId;
    if (params.projectId) where.project_id = params.projectId;
    if (params.logType) where.log_type = params.logType;
    if (params.startDate || params.endDate) {
      where.log_date = {};
      if (params.startDate) (where.log_date as Record<string, unknown>).gte = params.startDate;
      if (params.endDate) (where.log_date as Record<string, unknown>).lte = params.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.dailyLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { log_date: 'desc' },
        include: {
          user: { select: { id: true, first_name: true, last_name: true } },
          project: { select: { id: true, nj_number: true, title: true } },
        },
      }),
      prisma.dailyLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTodayStatus(userId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await prisma.dailyLog.findMany({
      where: {
        user_id: userId,
        log_date: { gte: today },
      },
      orderBy: { created_at: 'asc' },
    });

    const checkin = logs.find((l) => l.log_type === 'checkin');
    const checkout = logs.find((l) => l.log_type === 'checkout');

    return {
      checkedIn: !!checkin,
      checkedOut: !!checkout,
      checkinTime: checkin?.created_at ?? null,
      checkoutTime: checkout?.created_at ?? null,
      todayLogs: logs,
    };
  }
}

export const dailyLogService = new DailyLogService();
