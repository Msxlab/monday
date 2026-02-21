import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as aiChatController from '../controllers/ai-chat.controller';

const router = Router();

router.use(authenticate);

router.post('/message', aiChatController.sendMessage);
router.get('/history', aiChatController.getHistory);

export default router;
