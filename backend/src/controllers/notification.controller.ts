import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { notificationService } from '../services/notification.service';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';

export class NotificationController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, unread } = req.query as Record<string, string>;
      const result = await notificationService.list({
        userId: req.user!.userId,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        unreadOnly: unread === 'true',
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.getUnreadCount(req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async markRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notification = await notificationService.markRead(
        parseInt(req.params.id),
        req.user!.userId
      );
      res.json({ success: true, data: notification });
    } catch (err) {
      next(err);
    }
  }

  async markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAllRead(req.user!.userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { notification_preferences: true },
      });
      const defaults = {
        project_assigned: true,
        project_status_changed: true,
        project_comment: true,
        deadline_warning: true,
        leave_status: true,
        production_update: true,
        system_alert: true,
        email_enabled: false,
        push_enabled: true,
      };
      let prefs = defaults;
      if (user?.notification_preferences) {
        try { prefs = { ...defaults, ...JSON.parse(user.notification_preferences) }; } catch { /* use defaults */ }
      }
      res.json({ success: true, data: prefs });
    } catch (err) { next(err); }
  }

  async updatePreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        project_assigned: z.boolean().optional(),
        project_status_changed: z.boolean().optional(),
        project_comment: z.boolean().optional(),
        deadline_warning: z.boolean().optional(),
        leave_status: z.boolean().optional(),
        production_update: z.boolean().optional(),
        system_alert: z.boolean().optional(),
        email_enabled: z.boolean().optional(),
        push_enabled: z.boolean().optional(),
      });
      const body = schema.parse(req.body);
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { notification_preferences: JSON.stringify(body) },
      });
      res.json({ success: true, data: body });
    } catch (err) { next(err); }
  }
}

export const notificationController = new NotificationController();
