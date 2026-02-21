import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { pushService } from '../services/push.service';
import { AuthRequest } from '../types';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export class PushController {
  async getVapidKey(_req: AuthRequest, res: Response) {
    res.json({ success: true, data: { vapidPublicKey: pushService.getVapidPublicKey() } });
  }

  async subscribe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const subscription = subscribeSchema.parse(req.body);
      await pushService.subscribe(req.user!.userId, subscription);
      res.json({ success: true, message: 'Push subscription saved' });
    } catch (err) {
      next(err);
    }
  }

  async unsubscribe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { endpoint } = unsubscribeSchema.parse(req.body);
      await pushService.unsubscribe(req.user!.userId, endpoint);
      res.json({ success: true, message: 'Push subscription removed' });
    } catch (err) {
      next(err);
    }
  }

  async status(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const count = await pushService.getSubscriptionCount(req.user!.userId);
      res.json({ success: true, data: { subscribed: count > 0, count } });
    } catch (err) {
      next(err);
    }
  }
}

export const pushController = new PushController();
