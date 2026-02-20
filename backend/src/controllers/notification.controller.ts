import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { AuthRequest } from '../types';

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
}

export const notificationController = new NotificationController();
