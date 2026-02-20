import { Router } from 'express';
import { dailyLogController } from '../controllers/daily-log.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/today', dailyLogController.getTodayStatus.bind(dailyLogController));
router.get('/', dailyLogController.list.bind(dailyLogController));
router.post('/', dailyLogController.create.bind(dailyLogController));

export default router;
