import { Router } from 'express';
import { z } from 'zod';
import { aiQueryService } from '../services/ai-query.service';
import { AppError, UnauthorizedError } from '../utils/errors';

const router = Router();

const bodySchema = z.object({
  message: z.object({
    text: z.string().min(1).max(500),
    from: z.object({
      id: z.union([z.string(), z.number()]),
    }).optional(),
  }),
  company_id: z.number().int().positive(),
});

const senderLimits = new Map<string, { count: number; resetAt: number }>();

function enforceChannelRateLimit(key: string, max = 10, windowMs = 60_000): void {
  const now = Date.now();
  const entry = senderLimits.get(key);
  if (!entry || entry.resetAt < now) {
    senderLimits.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > max) {
    throw new AppError('Rate limit exceeded', 429);
  }
}

router.post('/', async (req, res, next) => {
  try {
    const token = req.headers['x-telegram-secret-token'];
    if (!process.env.TELEGRAM_WEBHOOK_SECRET || token !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      throw new UnauthorizedError('Invalid Telegram webhook token');
    }

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid Telegram payload', 400);
    }

    const senderId = String(parsed.data.message.from?.id ?? 'anonymous');
    enforceChannelRateLimit(`tg:${senderId}`);

    const response = await aiQueryService.orchestrate({
      message: parsed.data.message.text,
      companyId: parsed.data.company_id,
      channel: 'telegram-webhook',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      ok: true,
      reply: response,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
