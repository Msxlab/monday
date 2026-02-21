import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const userLimits = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60_000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userLimits) {
    if (entry.resetAt < now) userLimits.delete(key);
  }
}, CLEANUP_INTERVAL);
cleanupTimer.unref();

export function userRateLimit(maxRequests: number, windowMs: number) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) return next();

    const key = `${userId}:${req.route?.path || req.path}`;
    const now = Date.now();
    const entry = userLimits.get(key);

    if (!entry || entry.resetAt < now) {
      userLimits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter,
      });
    }

    next();
  };
}
