import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { dailyLogService } from '../services/daily-log.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

const createDailyLogSchema = z.object({
  project_id: z.number().int().positive().optional(),
  log_type: z.enum(['checkin', 'checkout', 'note', 'update']),
  content: z.string().optional(),
  log_date: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
});

export class DailyLogController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createDailyLogSchema.parse(req.body);
      const log = await dailyLogService.create(
        data as Parameters<typeof dailyLogService.create>[0],
        req.user!.userId
      );
      res.status(201).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, userId, projectId, logType, startDate, endDate } = req.query as Record<string, string>;
      const isAdmin = ['super_admin', 'admin'].includes(req.user!.role);

      const result = await dailyLogService.list({
        page: page ? parseId(page, 'page') : undefined,
        limit: limit ? parseId(limit, 'limit') : undefined,
        userId: isAdmin && userId ? parseId(userId, 'userId') : (!isAdmin ? req.user!.userId : undefined),
        projectId: projectId ? parseId(projectId, 'projectId') : undefined,
        logType: logType as never,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getTodayStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dailyLogService.getTodayStatus(req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const dailyLogController = new DailyLogController();
