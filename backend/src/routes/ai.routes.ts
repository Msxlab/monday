import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { authorizeAction } from '../middleware/authorize';
import { userRateLimit } from '../middleware/user-rate-limit';
import { aiQueryService } from '../services/ai-query.service';
import { AuthRequest } from '../types';
import { AppError } from '../utils/errors';

const router = Router();

const aiQuerySchema = z.object({
  message: z.string().min(1).max(500),
  company_id: z.number().int().positive(),
});

router.use(authenticate);
router.use(authorizeAction('query', 'ai', ['super_admin', 'admin', 'senior_designer']));
router.post('/query', userRateLimit(30, 60_000), async (req: AuthRequest, res, next) => {
  try {
    const parsed = aiQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Geçersiz AI sorgu payload', 400);
    }

    const response = await aiQueryService.orchestrate({
      message: parsed.data.message,
      companyId: parsed.data.company_id,
      requestedByUserId: req.user?.userId,
      channel: 'api',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
});

export default router;
