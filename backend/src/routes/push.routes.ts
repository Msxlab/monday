import { Router } from 'express';
import { pushController } from '../controllers/push.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/vapid-key', pushController.getVapidKey.bind(pushController));
router.use(authenticate);
router.post('/subscribe', pushController.subscribe.bind(pushController));
router.post('/unsubscribe', pushController.unsubscribe.bind(pushController));
router.get('/status', pushController.status.bind(pushController));

export default router;
