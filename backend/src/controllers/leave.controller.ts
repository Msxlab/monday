import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { leaveService } from '../services/leave.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

const createLeaveSchema = z.object({
  leave_type: z.enum(['annual', 'sick', 'excuse', 'remote']),
  start_date: z.string().datetime().transform((v) => new Date(v)),
  end_date: z.string().datetime().transform((v) => new Date(v)),
  is_half_day: z.boolean().optional(),
  half_day_period: z.enum(['am', 'pm']).optional(),
  notes: z.string().optional(),
});

const rejectLeaveSchema = z.object({
  reason: z.string().optional(),
});

export class LeaveController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const data = createLeaveSchema.parse(req.body);
      const leave = await leaveService.create(data as Parameters<typeof leaveService.create>[0], userId);
      res.status(201).json({ success: true, data: leave });
    } catch (err) {
      next(err);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, userId } = req.query as Record<string, string>;
      const isAdmin = ['super_admin', 'admin'].includes(req.user!.role);

      const result = await leaveService.list({
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        status: status as never,
        userId: isAdmin ? (userId ? parseInt(userId) : undefined) : req.user!.userId,
      });

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const leave = await leaveService.findById(parseId(req.params.id));
      const isAdmin = ['super_admin', 'admin'].includes(req.user!.role);
      if (!isAdmin && leave.user.id !== req.user!.userId) {
        res.status(403).json({ success: false, message: 'You do not have permission to view this leave' });
        return;
      }
      res.json({ success: true, data: leave });
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const leave = await leaveService.cancel(parseId(req.params.id), req.user!.userId);
      res.json({ success: true, data: leave });
    } catch (err) {
      next(err);
    }
  }

  async approve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const leave = await leaveService.approve(parseId(req.params.id), req.user!.userId);
      res.json({ success: true, data: leave });
    } catch (err) {
      next(err);
    }
  }

  async reject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = rejectLeaveSchema.parse(req.body);
      const leave = await leaveService.reject(
        parseId(req.params.id),
        req.user!.userId,
        reason
      );
      res.json({ success: true, data: leave });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await leaveService.getStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  async getBalance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : req.user!.userId;
      const isAdmin = ['super_admin', 'admin'].includes(req.user!.role);
      if (!isAdmin && userId !== req.user!.userId) {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }
      const balance = await leaveService.getBalance(userId);
      res.json({ success: true, data: balance });
    } catch (err) {
      next(err);
    }
  }

  async getTeamCalendar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const month = req.query.month !== undefined ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year !== undefined ? parseInt(req.query.year as string) : undefined;
      const data = await leaveService.getTeamCalendar(month, year);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const leaveController = new LeaveController();
