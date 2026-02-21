import { Router } from 'express';
import { z } from 'zod';
import { aiQueryService } from '../services/ai-query.service';
import { AppError, UnauthorizedError } from '../utils/errors';

const router = Router();

const bodySchema = z.object({
  from: z.string().min(3),
  message: z.string().min(1).max(500),
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

router.post('/incoming', async (req, res, next) => {
  try {
    const token = req.headers['x-whatsapp-signature'];
    if (!process.env.WHATSAPP_PROVIDER_SECRET || token !== process.env.WHATSAPP_PROVIDER_SECRET) {
      throw new UnauthorizedError('Invalid WhatsApp provider signature');
    }

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid WhatsApp payload', 400);
    }

    enforceChannelRateLimit(`wa:${parsed.data.from}`);

    const response = await aiQueryService.orchestrate({
      message: parsed.data.message,
      companyId: parsed.data.company_id,
      channel: 'whatsapp-provider',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
});

export default router;
