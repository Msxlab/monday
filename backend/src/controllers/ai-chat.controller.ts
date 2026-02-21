import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { aiChatService } from '../services/ai-chat.service';
import { AuthRequest } from '../types';

const sendMessageSchema = z.object({
  message: z.string().min(1),
  companyId: z.number().int().positive().optional(),
});

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { message, companyId } = sendMessageSchema.parse(req.body);
    const result = await aiChatService.processMessage(req.user!.userId, message, companyId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const history = aiChatService.getHistory(req.user!.userId, limit);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};
